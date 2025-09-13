import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/esm/supabase.js'
const SUPABASE_URL = window.SUPABASE_URL || 'https://ecgipbdepxdtlmomewub.supabase.co'
const SUPABASE_ANON = window.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2lwYmRlcHhkdGxtb21ld3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc1MDAsImV4cCI6MjA3MzM1MzUwMH0.luqdMaPgD5vLPUb4c7i_jGPU9k8-ymwGTZjs0ZQdxN4'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
let user = null
let currentRoom = null
const authArea = document.getElementById('authArea')
const profile = document.getElementById('profile')
const avatarEl = document.getElementById('avatar')
const displayNameEl = document.getElementById('displayName')
const emailEl = document.getElementById('email')
const controls = document.getElementById('controls')
const chatList = document.getElementById('chatList')
const messagesWrap = document.getElementById('messagesWrap')
const roomTitle = document.getElementById('roomTitle')
const msgForm = document.getElementById('msgForm')
const msgInput = document.getElementById('msgInput')
const fileInput = document.getElementById('fileInput')
const newDmBtn = document.getElementById('newDmBtn')
const newGroupBtn = document.getElementById('newGroupBtn')
const inviteBtn = document.getElementById('inviteBtn')
const inviteInput = document.getElementById('inviteInput')
function htmlEscape(s) { return (s || '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
async function boot() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) user = session.user
    renderAuth()
    supabase.auth.onAuthStateChange((_, sess) => { user = sess?.user || null; renderAuth(); })
    await listenRealtime()
}
function renderAuth() {
    if (!user) {
        authArea.innerHTML = '<button id="loginBtn">Sign in with Google</button>'
        document.getElementById('loginBtn').addEventListener('click', () => supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes: 'profile email' } }))
        profile.classList.add('hidden')
        controls.classList.add('hidden')
        msgForm.classList.add('hidden')
        roomTitle.textContent = 'Sign in to start'
        chatList.innerHTML = ''
        messagesWrap.innerHTML = ''
    } else {
        authArea.innerHTML = '<button id="logoutBtn">Logout</button>'
        document.getElementById('logoutBtn').addEventListener('click', () => supabase.auth.signOut())
        loadUserProfile()
        controls.classList.remove('hidden')
        fetchChats()
        msgForm.classList.remove('hidden')
        inviteBtn.classList.remove('hidden')
        inviteInput.classList.remove('hidden')
    }
}
async function loadUserProfile() {
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!data) await createUserOnFirstLogin()
    const profileData = (await supabase.from('users').select('*').eq('id', user.id).single()).data
    avatarEl.src = profileData.avatar_url || user.user_metadata?.avatar_url || '/placeholder.png'
    displayNameEl.textContent = profileData.username || profileData.display_name || user.email
    emailEl.textContent = user.email
    profile.classList.remove('hidden')
    if (!profileData.username) promptUsername()
}
async function createUserOnFirstLogin() {
    const meta = user.user_metadata || {}
    await supabase.from('users').insert([{ id: user.id, display_name: meta.full_name || meta.name || user.email, avatar_url: meta.avatar_url || meta.picture || null, email: user.email, username: null }])
}
async function promptUsername() {
    let uname = ''
    while (!uname) {
        uname = prompt('Pick a username (alphanumeric and underscore)')
        if (!uname) continue
        uname = uname.trim().toLowerCase()
        if (!/^[a-z0-9_]{3,32}$/.test(uname)) { alert('Invalid'); uname = ''; continue }
        const { data: exists } = await supabase.from('users').select('id').eq('username', uname).limit(1).maybeSingle()
        if (exists) { alert('Taken'); uname = ''; continue }
        await supabase.from('users').update({ username: uname }).eq('id', user.id)
    }
    await loadUserProfile()
}
async function fetchChats() {
    chatList.innerHTML = ''
    const { data: rooms } = await supabase.rpc('get_user_rooms', { uid: user.id })
    if (!rooms) return
    for (const r of rooms) {
        const li = document.createElement('li')
        li.dataset.id = r.id
        const img = document.createElement('img')
        img.src = r.avatar_url || '/placeholder.png'
        const d = document.createElement('div')
        d.innerHTML = `<div>${htmlEscape(r.title)}</div><div class="small">${htmlEscape(r.last_text || '')}</div>`
        li.appendChild(img); li.appendChild(d)
        li.addEventListener('click', () => openRoom(r.id))
        chatList.appendChild(li)
    }
}
async function openRoom(id) {
    currentRoom = id
    messagesWrap.innerHTML = ''
    const { data: room } = await supabase.from('rooms').select('*').eq('id', id).single()
    roomTitle.textContent = room.title
    const { data: msgs } = await supabase.from('messages_view').select('*').eq('room_id', id).order('created_at', { ascending: true }).limit(200)
    if (msgs) msgs.forEach(renderMessage)
    scrollBottom()
}
function renderMessage(m) {
    const el = document.createElement('div')
    el.className = 'msg ' + (m.sender_id === user.id ? 'me' : 'other')
    if (m.type === 'invite') {
        el.classList.add('invite')
        el.innerHTML = `<div class="meta">${htmlEscape(m.sender_username)} invited you to "${htmlEscape(m.group_title)}"</div><div class="small">Click to join</div>`
        el.addEventListener('click', () => acceptInvite(m.room_id))
    } else if (m.type === 'file') {
        el.innerHTML = `<div class="meta">${htmlEscape(m.sender_username)}</div><div><a target="_blank" rel="noreferrer" href="${htmlEscape(m.content)}">File: ${htmlEscape(m.content.split('/').pop())}</a></div>`
    } else {
        el.innerHTML = `<div class="meta">${htmlEscape(m.sender_username)}</div><div>${htmlEscape(m.content)}</div>`
    }
    messagesWrap.appendChild(el)
}
async function acceptInvite(groupId) {
    await supabase.from('room_members').insert([{ room_id: groupId, user_id: user.id }])
    openRoom(groupId)
}
msgForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!currentRoom) return
    const text = msgInput.value.trim()
    if (!text && !fileInput.files.length) return
    let fileUrl = null
    if (fileInput.files.length) {
        const f = fileInput.files[0]
        const path = `uploads/${user.id}/${Date.now()}_${f.name}`
        const { data, error } = await supabase.storage.from('uploads').upload(path, f, { upsert: false })
        if (error) { alert('Upload failed'); console.error(error); return }
        fileUrl = `${SUPABASE_URL.replace('.supabase.co', '')}.supabase.co/storage/v1/object/public/uploads/${encodeURIComponent(path)}`
        await supabase.from('messages').insert([{ room_id: currentRoom, sender_id: user.id, content: fileUrl, type: 'file' }])
        await supabase.from('rooms').update({ last_text: '[file]', updated_at: new Date().toISOString() }).eq('id', currentRoom)
        fileInput.value = ''
    }
    if (text) {
        await supabase.from('messages').insert([{ room_id: currentRoom, sender_id: user.id, content: text, type: 'text' }])
        await supabase.from('rooms').update({ last_text: text, updated_at: new Date().toISOString() }).eq('id', currentRoom)
        msgInput.value = ''
    }
})
newDmBtn.addEventListener('click', async () => {
    const username = prompt('Enter username to DM')
    if (!username) return
    const { data: target } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
    if (!target) { alert('Not found'); return }
    const ordered = [user.id, target.id].sort()
    const roomId = 'dm_' + ordered.join('_')
    const { data: exists } = await supabase.from('rooms').select('id').eq('id', roomId).maybeSingle()
    if (!exists) await supabase.from('rooms').insert([{ id: roomId, type: 'dm', title: target.username, avatar_url: target.avatar_url, last_text: null, created_by: user.id }])
    await supabase.from('room_members').insert([{ room_id: roomId, user_id: user.id }, { room_id: roomId, user_id: target.id }]).select()
    openRoom(roomId)
})
newGroupBtn.addEventListener('click', async () => {
    const title = prompt('Group name')
    if (!title) return
    const { data } = await supabase.from('rooms').insert([{ type: 'group', title, created_by: user.id, last_text: null }]).select().single()
    await supabase.from('room_members').insert([{ room_id: data.id, user_id: user.id }])
    openRoom(data.id)
})
inviteBtn.addEventListener('click', async () => {
    if (!currentRoom) { alert('Open a group first'); return }
    const uname = inviteInput.value.trim().toLowerCase()
    if (!uname) { alert('Enter username'); return }
    const { data: room } = await supabase.from('rooms').select('*').eq('id', currentRoom).single()
    if (!room || room.type !== 'group') { alert('Open a group chat you own to invite'); return }
    if (room.created_by !== user.id) { alert('Only owner can invite'); return }
    const { data: target } = await supabase.from('users').select('*').eq('username', uname).maybeSingle()
    if (!target) { alert('User not found'); return }
    await supabase.from('messages').insert([{ room_id: target.id, sender_id: user.id, content: 'invite', type: 'invite', group_title: room.title }])
    inviteInput.value = ''
    alert('Invite sent as DM')
})
async function listenRealtime() {
    supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const m = payload.new
            if (m.room_id === currentRoom) renderMessage({ ...m, sender_username: m.sender_username })
            fetchChats()
            scrollBottom()
        })
        .subscribe()
}
function scrollBottom() { messagesWrap.scrollTop = messagesWrap.scrollHeight }
boot()
