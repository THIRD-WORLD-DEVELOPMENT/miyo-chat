import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/esm/supabase.js'

// Global state
let supabase = null
let me = null
let currentRoom = null
let realtimeSub = null
let typingTimeout = null

// DOM elements
const loginPage = document.getElementById('loginPage')
const mainApp = document.getElementById('mainApp')
const authArea = document.getElementById('authArea')
const profile = document.getElementById('profile')
const avatarEl = document.getElementById('avatar')
const displayNameEl = document.getElementById('displayName')
const emailEl = document.getElementById('email')
const controls = document.getElementById('controls')
const chatList = document.getElementById('chatList')
const friendsList = document.getElementById('friendsList')
const messagesList = document.getElementById('messagesList')
const roomTitle = document.getElementById('roomTitle')
const roomStatus = document.getElementById('roomStatus')
const roomAvatar = document.getElementById('roomAvatar')
const msgForm = document.getElementById('msgForm')
const msgInput = document.getElementById('msgInput')
const fileInput = document.getElementById('fileInput')
const attachBtn = document.getElementById('attachBtn')
const sendBtn = document.getElementById('sendBtn')
const newDmBtn = document.getElementById('newDmBtn')
const newGroupBtn = document.getElementById('newGroupBtn')
const inviteBtn = document.getElementById('inviteBtn')
const inviteInput = document.getElementById('inviteInput')
const addFriendInput = document.getElementById('addFriendInput')
const addFriendBtn = document.getElementById('addFriendBtn')
const typingIndicator = document.getElementById('typingIndicator')
const modalOverlay = document.getElementById('modalOverlay')
const modalTitle = document.getElementById('modalTitle')
const modalContent = document.getElementById('modalContent')
const modalClose = document.getElementById('modalClose')
const notifications = document.getElementById('notifications')

// Utility functions
function escapeHtml(s) {
    return (s || '').toString().replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]))
}

function formatTime(date) {
    const now = new Date()
    const msgDate = new Date(date)
    const diff = now - msgDate
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return msgDate.toLocaleDateString()
}

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `
    
    notifications.appendChild(notification)
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out reverse'
        setTimeout(() => notification.remove(), 300)
    }, duration)
}

function showModal(title, content) {
    modalTitle.textContent = title
    modalContent.innerHTML = content
    modalOverlay.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
}

function hideModal() {
    modalOverlay.classList.add('hidden')
    document.body.style.overflow = ''
}

function scrollToBottom() {
    messagesList.scrollTop = messagesList.scrollHeight
}

// Initialize app
async function init() {
    try {
        const r = await fetch('/.netlify/functions/env')
        const env = await r.json()
        supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON)
        
        await handleSession()
        supabase.auth.onAuthStateChange((_, sess) => {
            me = sess?.user || null
            renderAuth()
            if (me) {
                setupRealtime()
                loadUserProfile()
            }
        })
        
        setupEventListeners()
    } catch (error) {
        console.error('Initialization failed:', error)
        showNotification('Failed to initialize app', 'error')
    }
}

async function handleSession() {
    const url = new URL(window.location.href)
    if (url.searchParams.get('access_token') || url.hash.includes('access_token')) {
        await supabase.auth.getSessionFromUrl({ storeSession: true })
    }
    const { data: { session } } = await supabase.auth.getSession()
    me = session?.user || null
    renderAuth()
    if (me) setupRealtime()
}

function renderAuth() {
    if (!me) {
        authArea.innerHTML = `
            <button id="loginBtn" class="login-btn">
                <i class="fab fa-google"></i>
                <span>Sign in with Google</span>
            </button>
        `
        
        const loginBtn = document.getElementById('loginBtn')
        loginBtn.addEventListener('click', () => 
            supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { scopes: 'profile email' }
            })
        )
        
        loginPage.classList.remove('hidden')
        mainApp.classList.add('hidden')
    } else {
        authArea.innerHTML = `
            <div class="user-menu">
                <img src="${me.user_metadata?.picture || '/placeholder.png'}" class="user-avatar" />
                <button id="logout" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `
        
        document.getElementById('logout').addEventListener('click', async () => {
            await supabase.auth.signOut()
            location.reload()
        })
        
        loginPage.classList.add('hidden')
        mainApp.classList.remove('hidden')
        profile.classList.remove('hidden')
        controls.classList.remove('hidden')
        msgForm.classList.remove('hidden')
    }
}

async function loadUserProfile() {
    try {
        const { data } = await supabase.from('users').select('*').eq('id', me.id).maybeSingle()
        
        if (!data) {
            const meta = me.user_metadata || {}
            await supabase.from('users').insert([{
                id: me.id,
                email: me.email,
                display_name: meta.name || me.email,
                avatar_url: meta.picture || null
            }])
        }
        
        const { data: profileData } = await supabase.from('users').select('*').eq('id', me.id).single()
        
        avatarEl.src = profileData.avatar_url || '/placeholder.png'
        displayNameEl.textContent = profileData.username || profileData.display_name || me.email
        emailEl.textContent = me.email
        profile.classList.remove('hidden')
        
        if (!profileData.username) await promptUsername()
        
        fetchChats()
        fetchFriends()
    } catch (error) {
        console.error('Error loading user profile:', error)
        showNotification('Failed to load profile', 'error')
    }
}

async function promptUsername() {
    const content = `
        <div class="username-form">
            <p>Choose a unique username for your account:</p>
            <input type="text" id="usernameInput" placeholder="Enter username" maxlength="32" />
            <div class="form-actions">
                <button id="saveUsername" class="btn btn-primary">Save</button>
            </div>
        </div>
    `
    
    showModal('Choose Username', content)
    
    const usernameInput = document.getElementById('usernameInput')
    const saveBtn = document.getElementById('saveUsername')
    
    saveBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim().toLowerCase()
        
        if (!username) {
            showNotification('Please enter a username', 'warning')
            return
        }
        
        if (!/^[a-z0-9_]{3,32}$/.test(username)) {
            showNotification('Username must be 3-32 characters: letters, numbers, underscore only', 'warning')
            return
        }
        
        try {
            const { data: exists } = await supabase.from('users').select('id').eq('username', username).maybeSingle()
            if (exists) {
                showNotification('Username already taken', 'error')
                return
            }
            
            await supabase.from('users').update({ username }).eq('id', me.id)
            displayNameEl.textContent = username
            hideModal()
            showNotification('Username saved successfully!', 'success')
        } catch (error) {
            console.error('Error saving username:', error)
            showNotification('Failed to save username', 'error')
        }
    })
}

async function fetchChats() {
    try {
        chatList.innerHTML = ''
        const { data: rooms } = await supabase.rpc('get_user_rooms', { uid: me.id })
        if (!rooms) return
        
        rooms.forEach(r => {
            const li = document.createElement('li')
            li.dataset.id = r.id
            
            const img = document.createElement('img')
            img.src = r.avatar_url || '/placeholder.png'
            img.alt = r.title
            
            const chatInfo = document.createElement('div')
            chatInfo.className = 'chat-info'
            
            const chatName = document.createElement('div')
            chatName.className = 'chat-name'
            chatName.textContent = escapeHtml(r.title)
            
            const chatPreview = document.createElement('div')
            chatPreview.className = 'chat-preview'
            chatPreview.textContent = escapeHtml(r.last_text || 'No messages yet')
            
            chatInfo.appendChild(chatName)
            chatInfo.appendChild(chatPreview)
            
            li.appendChild(img)
            li.appendChild(chatInfo)
            li.addEventListener('click', () => openRoom(r.id))
            chatList.appendChild(li)
        })
    } catch (error) {
        console.error('Error fetching chats:', error)
        showNotification('Failed to load chats', 'error')
    }
}

async function fetchFriends() {
    try {
        friendsList.innerHTML = ''
        
        // Get actual friends
        const { data: friends } = await supabase.rpc('get_user_friends', { uid: me.id })
        const friendsData = friends || []
        
        // Get pending friend requests
        const { data: pendingRequests } = await supabase.rpc('get_pending_friend_requests', { uid: me.id })
        const pendingData = pendingRequests || []
        
        // Show pending requests first
        if (pendingData.length > 0) {
            const pendingHeader = document.createElement('div')
            pendingHeader.className = 'friends-section-header'
            pendingHeader.innerHTML = `
                <h4><i class="fas fa-clock"></i> Pending Requests (${pendingData.length})</h4>
            `
            friendsList.appendChild(pendingHeader)
            
            pendingData.forEach(request => {
                const li = document.createElement('li')
                li.className = 'friend-request-item'
                
                const img = document.createElement('img')
                img.src = request.sender_avatar_url || '/placeholder.png'
                img.alt = request.sender_username
                
                const friendInfo = document.createElement('div')
                friendInfo.className = 'friend-info'
                
                const friendName = document.createElement('div')
                friendName.className = 'friend-name'
                friendName.textContent = request.sender_username || request.sender_display_name
                
                const friendStatus = document.createElement('div')
                friendStatus.className = 'friend-status'
                friendStatus.textContent = 'Wants to be friends'
                
                const friendActions = document.createElement('div')
                friendActions.className = 'friend-actions'
                
                const acceptBtn = document.createElement('button')
                acceptBtn.className = 'btn btn-success btn-sm'
                acceptBtn.innerHTML = '<i class="fas fa-check"></i>'
                acceptBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    acceptFriendRequest(request.id, request.sender_id)
                })
                
                const rejectBtn = document.createElement('button')
                rejectBtn.className = 'btn btn-danger btn-sm'
                rejectBtn.innerHTML = '<i class="fas fa-times"></i>'
                rejectBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    rejectFriendRequest(request.id)
                })
                
                friendActions.appendChild(acceptBtn)
                friendActions.appendChild(rejectBtn)
                
                friendInfo.appendChild(friendName)
                friendInfo.appendChild(friendStatus)
                
                li.appendChild(img)
                li.appendChild(friendInfo)
                li.appendChild(friendActions)
                
                friendsList.appendChild(li)
            })
        }
        
        // Show friends
        if (friendsData.length > 0) {
            const friendsHeader = document.createElement('div')
            friendsHeader.className = 'friends-section-header'
            friendsHeader.innerHTML = `
                <h4><i class="fas fa-user-friends"></i> Friends (${friendsData.length})</h4>
            `
            friendsList.appendChild(friendsHeader)
            
            friendsData.forEach(friend => {
                const li = document.createElement('li')
                
                const img = document.createElement('img')
                img.src = friend.avatar_url || '/placeholder.png'
                img.alt = friend.username
                
                const friendInfo = document.createElement('div')
                friendInfo.className = 'friend-info'
                
                const friendName = document.createElement('div')
                friendName.className = 'friend-name'
                friendName.textContent = friend.username || friend.display_name
                
                const friendStatus = document.createElement('div')
                friendStatus.className = 'friend-status'
                friendStatus.textContent = getStatusText(friend.status, friend.last_seen)
                friendStatus.classList.add(`status-${friend.status}`)
                
                friendInfo.appendChild(friendName)
                friendInfo.appendChild(friendStatus)
                
                li.appendChild(img)
                li.appendChild(friendInfo)
                
                li.addEventListener('click', () => startDM(friend))
                friendsList.appendChild(li)
            })
        }
        
        if (friendsData.length === 0 && pendingData.length === 0) {
            const emptyState = document.createElement('div')
            emptyState.className = 'empty-state'
            emptyState.innerHTML = `
                <i class="fas fa-user-plus"></i>
                <p>No friends yet</p>
                <small>Add friends to start chatting!</small>
            `
            friendsList.appendChild(emptyState)
        }
    } catch (error) {
        console.error('Error fetching friends:', error)
        showNotification('Failed to load friends', 'error')
    }
}

function getStatusText(status, lastSeen) {
    switch (status) {
        case 'online': return 'Online'
        case 'away': return 'Away'
        case 'busy': return 'Busy'
        case 'offline': 
            const lastSeenDate = new Date(lastSeen)
            const now = new Date()
            const diff = now - lastSeenDate
            
            if (diff < 300000) return 'Just now' // 5 minutes
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
            return 'Offline'
        default: return 'Unknown'
    }
}

async function acceptFriendRequest(requestId, senderId) {
    try {
        // Update friend request status
        await supabase.from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)
        
        // Create friendship
        const ordered = [me.id, senderId].sort()
        await supabase.from('friendships').insert([{
            user1_id: ordered[0],
            user2_id: ordered[1]
        }])
        
        showNotification('Friend request accepted!', 'success')
        fetchFriends()
    } catch (error) {
        console.error('Error accepting friend request:', error)
        showNotification('Failed to accept friend request', 'error')
    }
}

async function rejectFriendRequest(requestId) {
    try {
        await supabase.from('friend_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId)
        
        showNotification('Friend request rejected', 'info')
        fetchFriends()
    } catch (error) {
        console.error('Error rejecting friend request:', error)
        showNotification('Failed to reject friend request', 'error')
    }
}

async function openRoom(id) {
    try {
        currentRoom = id
        messagesList.innerHTML = ''
        
        // Update active chat
        document.querySelectorAll('.chat-list li').forEach(li => li.classList.remove('active'))
        document.querySelector(`[data-id="${id}"]`)?.classList.add('active')
        
        const { data: room } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle()
        
        roomTitle.textContent = room?.title || 'Chat'
        roomStatus.textContent = room?.type === 'group' ? 'Group chat' : 'Direct message'
        roomAvatar.src = room?.avatar_url || '/placeholder.png'
        
        const { data: msgs } = await supabase.from('messages_view')
            .select('*')
            .eq('room_id', id)
            .order('created_at', { ascending: true })
            .limit(200)
            
        if (msgs) msgs.forEach(renderMessage)
        scrollToBottom()
    } catch (error) {
        console.error('Error opening room:', error)
        showNotification('Failed to open chat', 'error')
    }
}

function renderMessage(m) {
    const messageEl = document.createElement('div')
    messageEl.className = `message ${m.sender_id === me.id ? 'me' : 'other'}`
    
    const messageContent = document.createElement('div')
    messageContent.className = 'message-content'
    
    if (m.type === 'invite') {
        messageContent.classList.add('invite')
        messageContent.innerHTML = `
            <div class="message-meta">
                <span class="message-sender">${escapeHtml(m.sender_username)}</span>
                <span class="message-time">${formatTime(m.created_at)}</span>
            </div>
            <div class="message-text">
                <i class="fas fa-user-plus"></i>
                Invited you to join "${escapeHtml(m.group_title)}"
            </div>
        `
        messageContent.addEventListener('click', () => acceptInvite(m.group_id || m.room_id))
    } else if (m.type === 'file') {
        messageContent.innerHTML = `
            <div class="message-meta">
                <span class="message-sender">${escapeHtml(m.sender_username)}</span>
                <span class="message-time">${formatTime(m.created_at)}</span>
            </div>
            <div class="message-file">
                <i class="fas fa-paperclip"></i>
                <a href="${escapeHtml(m.content)}" target="_blank" rel="noreferrer">File attachment</a>
            </div>
        `
    } else {
        messageContent.innerHTML = `
            <div class="message-meta">
                <span class="message-sender">${escapeHtml(m.sender_username)}</span>
                <span class="message-time">${formatTime(m.created_at)}</span>
            </div>
            <div class="message-text">${escapeHtml(m.content)}</div>
        `
    }
    
    messageEl.appendChild(messageContent)
    messagesList.appendChild(messageEl)
}

async function acceptInvite(groupId) {
    try {
        await supabase.from('room_members').insert([{
            room_id: groupId,
            user_id: me.id
        }])
        openRoom(groupId)
        showNotification('Joined group successfully!', 'success')
    } catch (error) {
        console.error('Error accepting invite:', error)
        showNotification('Failed to join group', 'error')
    }
}

async function startDM(user) {
    try {
        const ordered = [me.id, user.id].sort()
        const roomId = 'dm_' + ordered.join('_')
        
        const { data: exists } = await supabase.from('rooms').select('id').eq('id', roomId).maybeSingle()
        
        if (!exists) {
            await supabase.from('rooms').insert([{
                id: roomId,
                type: 'dm',
                title: user.username || user.display_name,
                avatar_url: user.avatar_url,
                last_text: null,
                created_by: me.id
            }])
        }
        
        await supabase.from('room_members').insert([
            { room_id: roomId, user_id: me.id },
            { room_id: roomId, user_id: user.id }
        ])
        
        openRoom(roomId)
        fetchChats()
    } catch (error) {
        console.error('Error starting DM:', error)
        showNotification('Failed to start conversation', 'error')
    }
}

function setupEventListeners() {
    // Message form
    msgForm.addEventListener('submit', handleMessageSubmit)
    
    // File attachment
    attachBtn.addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', handleFileUpload)
    
    // Typing indicator
    msgInput.addEventListener('input', handleTyping)
    
    // New DM
    newDmBtn.addEventListener('click', showNewDMModal)
    
    // New Group
    newGroupBtn.addEventListener('click', showNewGroupModal)
    
    // Invite to group
    inviteBtn.addEventListener('click', handleInvite)
    
    // Add friend
    addFriendBtn.addEventListener('click', handleAddFriend)
    
    // Modal close
    modalClose.addEventListener('click', hideModal)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideModal()
    })
    
    // Room actions
    document.getElementById('roomSettings').addEventListener('click', showRoomSettings)
    document.getElementById('roomMembers').addEventListener('click', showRoomMembers)
}

async function handleMessageSubmit(e) {
    e.preventDefault()
    if (!currentRoom) return
    
    const text = msgInput.value.trim()
    if (!text && !fileInput.files.length) return
    
    try {
        let fileUrl = null
        
        if (fileInput.files.length) {
            const f = fileInput.files[0]
            const path = `uploads/${me.id}/${Date.now()}_${f.name}`
            const { data, error } = await supabase.storage.from('uploads').upload(path, f)
            
            if (error) {
                showNotification('Upload failed', 'error')
                console.error(error)
                return
            }
            
            fileUrl = (await supabase.storage.from('uploads').getPublicUrl(path)).data.publicUrl
            
            await supabase.from('messages').insert([{
                room_id: currentRoom,
                sender_id: me.id,
                content: fileUrl,
                type: 'file'
            }])
            
            await supabase.from('rooms')
                .update({
                    last_text: '[file]',
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentRoom)
            
            fileInput.value = ''
        }
        
        if (text) {
            await supabase.from('messages').insert([{
                room_id: currentRoom,
                sender_id: me.id,
                content: text,
                type: 'text'
            }])
            
            await supabase.from('rooms')
                .update({
                    last_text: text,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentRoom)
            
            msgInput.value = ''
        }
    } catch (error) {
        console.error('Error sending message:', error)
        showNotification('Failed to send message', 'error')
    }
}

async function handleFileUpload() {
    if (fileInput.files.length) {
        const file = fileInput.files[0]
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showNotification('File too large. Maximum size is 10MB.', 'warning')
            fileInput.value = ''
            return
        }
        
        // Auto-send file
        const form = new FormData()
        form.append('file', file)
        await handleMessageSubmit({ preventDefault: () => {} })
    }
}

function handleTyping() {
    // TODO: Implement typing indicators
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
        // Stop typing indicator
    }, 1000)
}

function showNewDMModal() {
    const content = `
        <div class="new-dm-form">
            <p>Start a conversation with someone:</p>
            <input type="text" id="dmUsername" placeholder="Enter username" />
            <div class="form-actions">
                <button id="startDM" class="btn btn-primary">Start Chat</button>
                <button id="cancelDM" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `
    
    showModal('New Direct Message', content)
    
    const dmUsername = document.getElementById('dmUsername')
    const startDM = document.getElementById('startDM')
    const cancelDM = document.getElementById('cancelDM')
    
    startDM.addEventListener('click', async () => {
        const username = dmUsername.value.trim().toLowerCase()
        if (!username) {
            showNotification('Please enter a username', 'warning')
            return
        }
        
        try {
            const { data: target } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
            if (!target) {
                showNotification('User not found', 'error')
                return
            }
            
            await startDM(target)
            hideModal()
        } catch (error) {
            console.error('Error starting DM:', error)
            showNotification('Failed to start conversation', 'error')
        }
    })
    
    cancelDM.addEventListener('click', hideModal)
}

async function showNewGroupModal() {
    // Get friends list for member selection
    const { data: friends } = await supabase.rpc('get_user_friends', { uid: me.id })
    const friendsData = friends || []
    
    const content = `
        <div class="new-group-form">
            <div class="form-group">
                <label for="groupName">Group Name</label>
                <input type="text" id="groupName" placeholder="Enter group name" maxlength="50" />
            </div>
            
            <div class="form-group">
                <label>Add Members</label>
                <div class="member-search">
                    <input type="text" id="memberSearch" placeholder="Search friends..." />
                </div>
                <div class="selected-members" id="selectedMembers">
                    <div class="selected-member">
                        <img src="${me.user_metadata?.picture || '/placeholder.png'}" />
                        <span>You (Owner)</span>
                    </div>
                </div>
                <div class="available-members" id="availableMembers">
                    ${friendsData.map(friend => `
                        <div class="member-option" data-user-id="${friend.id}">
                            <img src="${friend.avatar_url || '/placeholder.png'}" />
                            <span>${friend.username || friend.display_name}</span>
                            <button class="add-member-btn" data-user-id="${friend.id}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="form-actions">
                <button id="createGroup" class="btn btn-primary">Create Group</button>
                <button id="cancelGroup" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `
    
    showModal('Create Group Chat', content)
    
    const groupName = document.getElementById('groupName')
    const memberSearch = document.getElementById('memberSearch')
    const selectedMembers = document.getElementById('selectedMembers')
    const availableMembers = document.getElementById('availableMembers')
    const createGroup = document.getElementById('createGroup')
    const cancelGroup = document.getElementById('cancelGroup')
    
    const selectedUserIds = new Set([me.id])
    
    // Member search functionality
    memberSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase()
        const memberOptions = availableMembers.querySelectorAll('.member-option')
        
        memberOptions.forEach(option => {
            const name = option.querySelector('span').textContent.toLowerCase()
            option.style.display = name.includes(searchTerm) ? 'flex' : 'none'
        })
    })
    
    // Add member functionality
    availableMembers.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-member-btn') || e.target.parentElement.classList.contains('add-member-btn')) {
            const btn = e.target.classList.contains('add-member-btn') ? e.target : e.target.parentElement
            const userId = btn.dataset.userId
            
            if (!selectedUserIds.has(userId)) {
                selectedUserIds.add(userId)
                updateSelectedMembers()
            }
        }
    })
    
    // Remove member functionality
    selectedMembers.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-member-btn') || e.target.parentElement.classList.contains('remove-member-btn')) {
            const btn = e.target.classList.contains('remove-member-btn') ? e.target : e.target.parentElement
            const userId = btn.dataset.userId
            
            if (userId !== me.id) { // Can't remove owner
                selectedUserIds.delete(userId)
                updateSelectedMembers()
            }
        }
    })
    
    function updateSelectedMembers() {
        selectedMembers.innerHTML = `
            <div class="selected-member">
                <img src="${me.user_metadata?.picture || '/placeholder.png'}" />
                <span>You (Owner)</span>
            </div>
        `
        
        friendsData.forEach(friend => {
            if (selectedUserIds.has(friend.id)) {
                const memberEl = document.createElement('div')
                memberEl.className = 'selected-member'
                memberEl.innerHTML = `
                    <img src="${friend.avatar_url || '/placeholder.png'}" />
                    <span>${friend.username || friend.display_name}</span>
                    <button class="remove-member-btn" data-user-id="${friend.id}">
                        <i class="fas fa-times"></i>
                    </button>
                `
                selectedMembers.appendChild(memberEl)
            }
        })
        
        // Update available members
        const memberOptions = availableMembers.querySelectorAll('.member-option')
        memberOptions.forEach(option => {
            const userId = option.dataset.userId
            const addBtn = option.querySelector('.add-member-btn')
            
            if (selectedUserIds.has(userId)) {
                option.style.opacity = '0.5'
                addBtn.innerHTML = '<i class="fas fa-check"></i>'
                addBtn.disabled = true
            } else {
                option.style.opacity = '1'
                addBtn.innerHTML = '<i class="fas fa-plus"></i>'
                addBtn.disabled = false
            }
        })
    }
    
    createGroup.addEventListener('click', async () => {
        const title = groupName.value.trim()
        if (!title) {
            showNotification('Please enter a group name', 'warning')
            return
        }
        
        if (selectedUserIds.size < 2) {
            showNotification('Please add at least one member to the group', 'warning')
            return
        }
        
        try {
            const { data } = await supabase.from('rooms')
                .insert([{
                    type: 'group',
                    title,
                    created_by: me.id,
                    last_text: null
                }])
                .select()
                .single()
            
            // Add all selected members
            const members = Array.from(selectedUserIds).map(userId => ({
                room_id: data.id,
                user_id: userId,
                role: userId === me.id ? 'owner' : 'member'
            }))
            
            await supabase.from('room_members').insert(members)
            
            openRoom(data.id)
            fetchChats()
            hideModal()
            showNotification('Group created successfully!', 'success')
        } catch (error) {
            console.error('Error creating group:', error)
            showNotification('Failed to create group', 'error')
        }
    })
    
    cancelGroup.addEventListener('click', hideModal)
}

async function handleInvite() {
    if (!currentRoom) {
        showNotification('Open a group first', 'warning')
        return
    }
    
    const uname = inviteInput.value.trim().toLowerCase()
    if (!uname) {
        showNotification('Enter username', 'warning')
        return
    }
    
    try {
        const { data: room } = await supabase.from('rooms').select('*').eq('id', currentRoom).single()
        
        if (!room || room.type !== 'group') {
            showNotification('Open a group chat to invite', 'warning')
            return
        }
        
        if (room.created_by !== me.id) {
            showNotification('Only group owner can invite', 'warning')
            return
        }
        
        const { data: target } = await supabase.from('users').select('*').eq('username', uname).maybeSingle()
        if (!target) {
            showNotification('User not found', 'error')
            return
        }
        
        // Create DM room for invite if it doesn't exist
        const ordered = [me.id, target.id].sort()
        const dmRoomId = 'dm_' + ordered.join('_')
        
        const { data: dmExists } = await supabase.from('rooms').select('id').eq('id', dmRoomId).maybeSingle()
        
        if (!dmExists) {
            await supabase.from('rooms').insert([{
                id: dmRoomId,
                type: 'dm',
                title: target.username,
                avatar_url: target.avatar_url,
                last_text: null,
                created_by: me.id
            }])
            
            await supabase.from('room_members').insert([
                { room_id: dmRoomId, user_id: me.id },
                { room_id: dmRoomId, user_id: target.id }
            ])
        }
        
        await supabase.from('messages').insert([{
            room_id: dmRoomId,
            sender_id: me.id,
            content: 'invite',
            type: 'invite',
            group_title: room.title,
            group_id: room.id
        }])
        
        inviteInput.value = ''
        showNotification('Invite sent successfully!', 'success')
    } catch (error) {
        console.error('Error sending invite:', error)
        showNotification('Failed to send invite', 'error')
    }
}

async function handleAddFriend() {
    const username = addFriendInput.value.trim().toLowerCase()
    if (!username) {
        showNotification('Please enter a username', 'warning')
        return
    }
    
    try {
        const { data: target } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
        if (!target) {
            showNotification('User not found', 'error')
            return
        }
        
        if (target.id === me.id) {
            showNotification('You cannot add yourself as a friend', 'warning')
            return
        }
        
        // Check if already friends
        const { data: existingFriendship } = await supabase.from('friendships')
            .select('id')
            .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
            .or(`user1_id.eq.${target.id},user2_id.eq.${target.id}`)
            .maybeSingle()
        
        if (existingFriendship) {
            showNotification('You are already friends with this user', 'info')
            return
        }
        
        // Check if friend request already exists
        const { data: existingRequest } = await supabase.from('friend_requests')
            .select('id, status')
            .eq('sender_id', me.id)
            .eq('receiver_id', target.id)
            .maybeSingle()
        
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                showNotification('Friend request already sent', 'info')
                return
            } else if (existingRequest.status === 'rejected') {
                showNotification('This user previously rejected your friend request', 'warning')
                return
            }
        }
        
        // Send friend request
        await supabase.from('friend_requests').insert([{
            sender_id: me.id,
            receiver_id: target.id
        }])
        
        addFriendInput.value = ''
        showNotification(`Friend request sent to ${target.username}!`, 'success')
        
        // Refresh friends list to show any pending requests
        fetchFriends()
    } catch (error) {
        console.error('Error adding friend:', error)
        showNotification('Failed to send friend request', 'error')
    }
}

function showRoomSettings() {
    if (!currentRoom) return
    
    const content = `
        <div class="room-settings">
            <h4>Room Settings</h4>
            <p>Room ID: ${currentRoom}</p>
            <div class="settings-actions">
                <button id="leaveRoom" class="btn btn-danger">Leave Room</button>
            </div>
        </div>
    `
    
    showModal('Room Settings', content)
    
    document.getElementById('leaveRoom').addEventListener('click', async () => {
        try {
            await supabase.from('room_members').delete().eq('room_id', currentRoom).eq('user_id', me.id)
            currentRoom = null
            hideModal()
            fetchChats()
            showNotification('Left room successfully', 'success')
        } catch (error) {
            console.error('Error leaving room:', error)
            showNotification('Failed to leave room', 'error')
        }
    })
}

async function showRoomMembers() {
    if (!currentRoom) return
    
    try {
        // Get room info
        const { data: room } = await supabase.from('rooms').select('*').eq('id', currentRoom).single()
        
        // Get room members with user details
        const { data: members } = await supabase
            .from('room_members')
            .select(`
                *,
                users:user_id (
                    id,
                    username,
                    display_name,
                    avatar_url,
                    status
                )
            `)
            .eq('room_id', currentRoom)
        
        const content = `
            <div class="room-members">
                <div class="room-info-header">
                    <h4>${room?.title || 'Room Members'}</h4>
                    <span class="member-count">${members?.length || 0} members</span>
                </div>
                
                <div class="member-search-section">
                    <input type="text" id="memberSearchInput" placeholder="Search members..." />
                </div>
                
                <div id="membersList" class="members-list">
                    ${members?.map(member => `
                        <div class="member-item" data-user-id="${member.user_id}">
                            <img src="${member.users?.avatar_url || '/placeholder.png'}" />
                            <div class="member-info">
                                <div class="member-name">
                                    ${member.users?.username || member.users?.display_name || 'Unknown'}
                                    ${member.user_id === me.id ? '(You)' : ''}
                                </div>
                                <div class="member-role">${member.role}</div>
                                <div class="member-status status-${member.users?.status || 'offline'}">
                                    ${getStatusText(member.users?.status || 'offline', member.joined_at)}
                                </div>
                            </div>
                            <div class="member-actions">
                                ${member.user_id !== me.id && room?.created_by === me.id ? `
                                    <button class="btn btn-sm btn-danger remove-member-btn" data-user-id="${member.user_id}">
                                        <i class="fas fa-user-minus"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('') || '<p>No members found</p>'}
                </div>
                
                ${room?.created_by === me.id ? `
                    <div class="add-member-section">
                        <button id="addMemberBtn" class="btn btn-primary">
                            <i class="fas fa-user-plus"></i>
                            Add Member
                        </button>
                    </div>
                ` : ''}
            </div>
        `
        
        showModal('Room Members', content)
        
        // Setup member search
        const memberSearchInput = document.getElementById('memberSearchInput')
        memberSearchInput?.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase()
            const memberItems = document.querySelectorAll('.member-item')
            
            memberItems.forEach(item => {
                const name = item.querySelector('.member-name').textContent.toLowerCase()
                item.style.display = name.includes(searchTerm) ? 'flex' : 'none'
            })
        })
        
        // Setup remove member functionality
        document.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.closest('.remove-member-btn').dataset.userId
                if (confirm('Are you sure you want to remove this member?')) {
                    try {
                        await supabase.from('room_members')
                            .delete()
                            .eq('room_id', currentRoom)
                            .eq('user_id', userId)
                        
                        showNotification('Member removed successfully', 'success')
                        showRoomMembers() // Refresh the modal
                    } catch (error) {
                        console.error('Error removing member:', error)
                        showNotification('Failed to remove member', 'error')
                    }
                }
            })
        })
        
        // Setup add member functionality
        const addMemberBtn = document.getElementById('addMemberBtn')
        addMemberBtn?.addEventListener('click', () => {
            showAddMemberModal()
        })
        
    } catch (error) {
        console.error('Error loading room members:', error)
        showNotification('Failed to load room members', 'error')
    }
}

async function showAddMemberModal() {
    try {
        // Get friends who are not already in the room
        const { data: friends } = await supabase.rpc('get_user_friends', { uid: me.id })
        const friendsData = friends || []
        
        // Get current room members
        const { data: currentMembers } = await supabase
            .from('room_members')
            .select('user_id')
            .eq('room_id', currentRoom)
        
        const memberIds = new Set(currentMembers?.map(m => m.user_id) || [])
        
        // Filter out friends who are already in the room
        const availableFriends = friendsData.filter(friend => !memberIds.has(friend.id))
        
        const content = `
            <div class="add-member-modal">
                <div class="form-group">
                    <label>Add Members to Group</label>
                    <div class="member-search">
                        <input type="text" id="addMemberSearch" placeholder="Search friends..." />
                    </div>
                    <div class="available-friends" id="availableFriends">
                        ${availableFriends.map(friend => `
                            <div class="friend-option" data-user-id="${friend.id}">
                                <img src="${friend.avatar_url || '/placeholder.png'}" />
                                <span>${friend.username || friend.display_name}</span>
                                <button class="btn btn-sm btn-primary add-to-group-btn" data-user-id="${friend.id}">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button id="closeAddMember" class="btn btn-secondary">Close</button>
                </div>
            </div>
        `
        
        showModal('Add Members', content)
        
        // Setup search
        const addMemberSearch = document.getElementById('addMemberSearch')
        addMemberSearch?.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase()
            const friendOptions = document.querySelectorAll('.friend-option')
            
            friendOptions.forEach(option => {
                const name = option.querySelector('span').textContent.toLowerCase()
                option.style.display = name.includes(searchTerm) ? 'flex' : 'none'
            })
        })
        
        // Setup add to group functionality
        document.querySelectorAll('.add-to-group-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.closest('.add-to-group-btn').dataset.userId
                
                try {
                    await supabase.from('room_members').insert([{
                        room_id: currentRoom,
                        user_id: userId,
                        role: 'member'
                    }])
                    
                    showNotification('Member added successfully!', 'success')
                    hideModal()
                    showRoomMembers() // Refresh the members modal
                } catch (error) {
                    console.error('Error adding member:', error)
                    showNotification('Failed to add member', 'error')
                }
            })
        })
        
        // Setup close button
        document.getElementById('closeAddMember').addEventListener('click', hideModal)
        
    } catch (error) {
        console.error('Error loading friends for adding:', error)
        showNotification('Failed to load friends', 'error')
    }
}

function setupRealtime() {
    if (realtimeSub) return
    
    realtimeSub = supabase
        .channel('public:messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, payload => {
            const m = payload.new
            if (currentRoom && m.room_id === currentRoom) {
                // Fetch the message with sender username
                supabase.from('messages_view')
                    .select('*')
                    .eq('id', m.id)
                    .single()
                    .then(({ data }) => {
                        if (data) renderMessage(data)
                    })
            }
            fetchChats()
            scrollToBottom()
        })
        .subscribe()
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Ensure login page is visible initially
    const loginPage = document.getElementById('loginPage')
    const mainApp = document.getElementById('mainApp')
    
    if (loginPage) {
        loginPage.classList.remove('hidden')
    }
    if (mainApp) {
        mainApp.classList.add('hidden')
    }
    
    init()
})
