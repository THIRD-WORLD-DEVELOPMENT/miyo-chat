let supabaseClient = null;
let currentUser = null;

async function initSupabase() {
  // Fetch environment variables from Netlify Function
  const res = await fetch('/.netlify/functions/env');
  const { SUPABASE_URL, SUPABASE_ANON } = await res.json();

  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // Listen to auth changes
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      document.getElementById('google-signin').style.display = 'none';
      loadChats();
    } else {
      document.getElementById('google-signin').style.display = 'block';
    }
  });
}

async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) alert(error.message);
}

async function loadChats() {
  const { data, error } = await supabaseClient
    .rpc('get_user_rooms', { uid: currentUser.id });

  if (error) {
    console.error(error);
    return;
  }

  const chatList = document.getElementById('chats');
  chatList.innerHTML = '';
  data.forEach((chat) => {
    const div = document.createElement('div');
    div.textContent = chat.title || chat.id;
    div.onclick = () => openChat(chat.id, chat.title);
    chatList.appendChild(div);
  });
}

async function openChat(roomId, title) {
  document.getElementById('chat-title').textContent = title;
  const { data, error } = await supabaseClient
    .from('messages_view')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const msgDiv = document.getElementById('messages');
  msgDiv.innerHTML = '';
  data.forEach((msg) => {
    const p = document.createElement('p');
    p.textContent = `${msg.sender_username}: ${msg.content}`;
    msgDiv.appendChild(p);
  });

  // Subscribe to realtime messages
  supabaseClient
    .channel('room_' + roomId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const p = document.createElement('p');
        p.textContent = `${payload.new.sender_id}: ${payload.new.content}`;
        msgDiv.appendChild(p);
      }
    )
    .subscribe();

  document.getElementById('send-btn').onclick = async () => {
    const content = document.getElementById('message-input').value;
    if (!content) return;

    const { error } = await supabaseClient.from('messages').insert({
      room_id: roomId,
      sender_id: currentUser.id,
      content,
    });

    if (error) console.error(error);
    document.getElementById('message-input').value = '';
  };
}

document.getElementById('google-signin').addEventListener('click', signInWithGoogle);

initSupabase();
