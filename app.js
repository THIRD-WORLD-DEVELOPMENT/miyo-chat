import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/esm/supabase.js'

let supabase = null
let me = null
let currentRoom = null

const authArea = document.getElementById('authArea')
const profile = document.getElementById('profile')
const avatarEl = document.getElementById('avatar')
const displayNameEl = document.getElementById('displayName')
const emailEl = document.getElementById('email')
const controls = document.getElementById('controls')
const chatList = document.getElementById('chatList')
const friendsList = document.getElementById('friendsList')
const messagesWrap = document.getElementById('messagesWrap')
const roomTitle = document.getElementById('roomTitle')
const msgForm = document.getElementById('msgForm')
const msgInput = document.getElementById('msgInput')
const fileInput = document.getElementById('fileInput')
const newDmBtn = document.getElementById('newDmBtn')
const newGroupBtn = document.getElementById('newGroupBtn')
const inviteBtn = document.getElementById('inviteBtn')
const inviteInput = document.getElementById('inviteInput')
const addFriendInput = document.getElementById('addFriendInput')
const addFriendBtn = document.getElementById('addFriendBtn')

function escapeHtml(s) {
    return (s || '').toString().replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]))
}

async function init() {
    try {
        const r = await fetch('/.netlify/functions/env')
        const env = await r.json()
        supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON)
        await handleSession()
        supabase.auth.onAuthStateChange((_, sess) => {
            me = sess?.user || null
            renderAuth()
            if (me) setupRealtime()
        })
    } catch (error) {
        console.error('Initialization failed:', error)
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
        authArea.innerHTML = '<button id="loginBtn">Sign in with Google</button>'
        document.getElementById('loginBtn').addEventListener('click', () => 
            supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { scopes: 'profile email' }
            })
        )
        profile.classList.add('hidden')
        controls.classList.add('hidden')
        msgForm.classList.add('hidden')
        roomTitle.textContent = 'Sign in with Google'
        chatList.innerHTML = ''
        friendsList.innerHTML = ''
        messagesWrap.innerHTML = ''
    } else {
        authArea.innerHTML = '<button id="logout">Logout</button>'
        document.getElementById('logout').addEventListener('click', async () => {
            await supabase.auth.signOut()
            location.reload()
        })
        loadUserProfile()
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
    }
}

async function promptUsername() {
    let uname = ''
    while (!uname) {
        uname = prompt('Pick a username (alphanumeric and underscore)')
        if (!uname) continue
        
        uname = uname.trim().toLowerCase()
        if (!/^[a-z0-9_]{3,32}$/.test(uname)) {
            alert('Invalid username. Use 3-32 characters: letters, numbers, underscore only')
            uname = ''
            continue
        }
        
        const { data: exists } = await supabase.from('users').select('id').eq('username', uname).maybeSingle()
        if (exists) {
            alert('Username already taken')
            uname = ''
            continue
        }
        
        await supabase.from('users').update({ username: uname }).eq('id', me.id)
    }
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
            
            const d = document.createElement('div')
            d.innerHTML = `<div>${escapeHtml(r.title)}</div><div class="small">${escapeHtml(r.last_text || '')}</div>`
            
            li.appendChild(img)
            li.appendChild(d)
            li.addEventListener('click', () => openRoom(r.id))
            chatList.appendChild(li)
        })
    } catch (error) {
        console.error('Error fetching chats:', error)
    }
}

async function fetchFriends() {
    try {
        friendsList.innerHTML = ''
        const { data } = await supabase.from('users').select('*').limit(100)
        const users = data || []
        
        users.forEach(u => {
            const li = document.createElement('li')
            li.textContent = u.username || u.display_name || u.email
            friendsList.appendChild(li)
        })
    } catch (error) {
        console.error('Error fetching friends:', error)
    }
}

async function openRoom(id) {
    try {
        currentRoom = id
        messagesWrap.innerHTML = ''
        
        const { data: room } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle()
        roomTitle.textContent = room?.title || 'Chat'
        
        const { data: msgs } = await supabase.from('messages_view')
            .select('*')
            .eq('room_id', id)
            .order('created_at', { ascending: true })
            .limit(200)
            
        if (msgs) msgs.forEach(renderMessage)
        scrollBottom()
    } catch (error) {
        console.error('Error opening room:', error)
    }
}

function renderMessage(m) {
    const el = document.createElement('div')
    el.className = 'msg ' + (m.sender_id === me.id ? 'me' : 'other')
    
    if (m.type === 'invite') {
        el.classList.add('invite')
        el.innerHTML = `<div class="meta">${escapeHtml(m.sender_username)} invited you to "${escapeHtml(m.group_title)}"</div><div class="small">Click to join</div>`
        el.addEventListener('click', () => acceptInvite(m.group_id || m.room_id))
    } else if (m.type === 'file') {
        el.innerHTML = `<div class="meta">${escapeHtml(m.sender_username)}</div><div><a target="_blank" rel="noreferrer" href="${escapeHtml(m.content)}">File</a></div>`
    } else {
        el.innerHTML = `<div class="meta">${escapeHtml(m.sender_username)}</div><div>${escapeHtml(m.content)}</div>`
    }
    
    messagesWrap.appendChild(el)
}

async function acceptInvite(groupId) {
    try {
        await supabase.from('room_members').insert([{
            room_id: groupId,
            user_id: me.id
        }])
        openRoom(groupId)
    } catch (error) {
        console.error('Error accepting invite:', error)
    }
}

msgForm.addEventListener('submit', async e => {
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
                alert('Upload failed')
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
        alert('Failed to send message')
    }
})

newDmBtn.addEventListener('click', async () => {
    try {
        const username = prompt('Enter username to DM')
        if (!username) return
        
        const { data: target } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
        if (!target) {
            alert('User not found')
            return
        }
        
        const ordered = [me.id, target.id].sort()
        const roomId = 'dm_' + ordered.join('_')
        
        const { data: exists } = await supabase.from('rooms').select('id').eq('id', roomId).maybeSingle()
        
        if (!exists) {
            await supabase.from('rooms').insert([{
                id: roomId,
                type: 'dm',
                title: target.username,
                avatar_url: target.avatar_url,
                last_text: null,
                created_by: me.id
            }])
        }
        
        await supabase.from('room_members').insert([
            { room_id: roomId, user_id: me.id },
            { room_id: roomId, user_id: target.id }
        ])
        
        openRoom(roomId)
    } catch (error) {
        console.error('Error creating DM:', error)
        alert('Failed to create DM')
    }
})

newGroupBtn.addEventListener('click', async () => {
    try {
        const title = prompt('Group name')
        if (!title) return
        
        const { data } = await supabase.from('rooms')
            .insert([{
                type: 'group',
                title,
                created_by: me.id,
                last_text: null
            }])
            .select()
            .single()
        
        await supabase.from('room_members').insert([{
            room_id: data.id,
            user_id: me.id
        }])
        
        openRoom(data.id)
    } catch (error) {
        console.error('Error creating group:', error)
        alert('Failed to create group')
    }
})

inviteBtn.addEventListener('click', async () => {
    try {
        if (!currentRoom) {
            alert('Open a group first')
            return
        }
        
        const uname = inviteInput.value.trim().toLowerCase()
        if (!uname) {
            alert('Enter username')
            return
        }
        
        const { data: room } = await supabase.from('rooms').select('*').eq('id', currentRoom).single()
        
        if (!room || room.type !== 'group') {
            alert('Open a group chat to invite')
            return
        }
        
        if (room.created_by !== me.id) {
            alert('Only owner can invite')
            return
        }
        
        const { data: target } = await supabase.from('users').select('*').eq('username', uname).maybeSingle()
        if (!target) {
            alert('User not found')
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
        alert('Invite sent as DM')
    } catch (error) {
        console.error('Error sending invite:', error)
        alert('Failed to send invite')
    }
})

addFriendBtn.addEventListener('click', async () => {
    try {
        const username = addFriendInput.value.trim().toLowerCase()
        if (!username) return
        
        const { data: target } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
        if (!target) {
            alert('User not found')
            return
        }
        
        const ordered = [me.id, target.id].sort()
        const roomId = 'dm_' + ordered.join('_')
        
        const { data: exists } = await supabase.from('rooms').select('id').eq('id', roomId).maybeSingle()
        
        if (!exists) {
            await supabase.from('rooms').insert([{
                id: roomId,
                type: 'dm',
                title: target.username,
                avatar_url: target.avatar_url,
                last_text: null,
                created_by: me.id
            }])
        }
        
        await supabase.from('room_members').insert([
            { room_id: roomId, user_id: me.id },
            { room_id: roomId, user_id: target.id }
        ])
        
        addFriendInput.value = ''
        openRoom(roomId)
        fetchChats()
    } catch (error) {
        console.error('Error adding friend:', error)
        alert('Failed to add friend')
    }
})

let realtimeSub = null

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
            scrollBottom()
        })
        .subscribe()
}

function scrollBottom() {
    messagesWrap.scrollTop = messagesWrap.scrollHeight
}

init()
