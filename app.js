let currentUser = null;
let currentChat = null;
let chats = [];
let friends = [];
let groups = [];
let messages = {};

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});
function loadData() {
    const savedChats = localStorage.getItem('chats');
    const savedFriends = localStorage.getItem('friends');
    const savedGroups = localStorage.getItem('groups');
    const savedMessages = localStorage.getItem('messages');
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }

    chats = savedChats ? JSON.parse(savedChats) : getDemoChats();
    friends = savedFriends ? JSON.parse(savedFriends) : getDemoFriends();
    groups = savedGroups ? JSON.parse(savedGroups) : getDemoGroups();
    messages = savedMessages ? JSON.parse(savedMessages) : getDemoMessages();

    renderChats();
    renderFriends();
    renderGroups();
}

function saveData() {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('friends', JSON.stringify(friends));
    localStorage.setItem('groups', JSON.stringify(groups));
    localStorage.setItem('messages', JSON.stringify(messages));
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

function getDemoChats() {
    return [
        {
            id: 'chat1',
            name: 'John Doe',
            avatar: 'https://via.placeholder.com/40/10b981/ffffff?text=JD',
            lastMessage: 'Hey! How are you doing?',
            lastTime: new Date(Date.now() - 3600000).toISOString(),
            type: 'dm',
            userId: 'user1'
        },
        {
            id: 'chat2',
            name: 'Team Chat',
            avatar: 'https://via.placeholder.com/40/8b5cf6/ffffff?text=TC',
            lastMessage: 'Meeting at 3 PM today',
            lastTime: new Date(Date.now() - 1800000).toISOString(),
            type: 'group',
            userId: 'group1'
        },
        {
            id: 'chat3',
            name: 'Jane Smith',
            avatar: 'https://via.placeholder.com/40/f59e0b/ffffff?text=JS',
            lastMessage: 'Thanks for the help!',
            lastTime: new Date(Date.now() - 7200000).toISOString(),
            type: 'dm',
            userId: 'user2'
        }
    ];
}

function getDemoFriends() {
    return [
        {
            id: 'user1',
            name: 'John Doe',
            username: 'johndoe',
            avatar: 'https://via.placeholder.com/40/10b981/ffffff?text=JD',
            status: 'online'
        },
        {
            id: 'user2',
            name: 'Jane Smith',
            username: 'janesmith',
            avatar: 'https://via.placeholder.com/40/f59e0b/ffffff?text=JS',
            status: 'away'
        },
        {
            id: 'user3',
            name: 'Mike Johnson',
            username: 'mikej',
            avatar: 'https://via.placeholder.com/40/ef4444/ffffff?text=MJ',
            status: 'offline'
        }
    ];
}

function getDemoGroups() {
    return [
        {
            id: 'group1',
            name: 'Team Chat',
            avatar: 'https://via.placeholder.com/40/8b5cf6/ffffff?text=TC',
            members: ['user1', 'user2', 'user3'],
            lastMessage: 'Meeting at 3 PM today',
            lastTime: new Date(Date.now() - 1800000).toISOString()
        },
        {
            id: 'group2',
            name: 'Family Group',
            avatar: 'https://via.placeholder.com/40/06b6d4/ffffff?text=FG',
            members: ['user1', 'user2'],
            lastMessage: 'Happy birthday!',
            lastTime: new Date(Date.now() - 86400000).toISOString()
        }
    ];
}

function getDemoMessages() {
    return {
        'chat1': [
            {
                id: 'msg1',
                senderId: 'user1',
                senderName: 'John Doe',
                content: 'Hey! How are you doing?',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                type: 'text'
            },
            {
                id: 'msg2',
                senderId: 'current',
                senderName: 'You',
                content: 'I\'m doing great! Thanks for asking.',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                type: 'text'
            },
            {
                id: 'msg3',
                senderId: 'user1',
                senderName: 'John Doe',
                content: 'That\'s awesome! Want to grab lunch later?',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                type: 'text'
            }
        ],
        'chat2': [
            {
                id: 'msg4',
                senderId: 'user1',
                senderName: 'John Doe',
                content: 'Meeting at 3 PM today',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                type: 'text'
            },
            {
                id: 'msg5',
                senderId: 'user2',
                senderName: 'Jane Smith',
                content: 'Got it! I\'ll be there.',
                timestamp: new Date(Date.now() - 1200000).toISOString(),
                type: 'text'
            }
        ],
        'chat3': [
            {
                id: 'msg6',
                senderId: 'user2',
                senderName: 'Jane Smith',
                content: 'Thanks for the help!',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                type: 'text'
            }
        ]
    };
}

function handleLogin() {
    const user = {
        id: 'current',
        name: 'Guest User',
        email: 'guest@chatmiyo.com',
        avatar: 'https://via.placeholder.com/40/6366f1/ffffff?text=GU'
    };
    
    currentUser = user;
    showMainApp();
    saveData();
}

function handleGuestLogin() {
    const user = {
        id: 'current',
        name: 'Guest User',
        email: 'guest@chatmiyo.com',
        avatar: 'https://via.placeholder.com/40/6366f1/ffffff?text=GU'
    };
    
    currentUser = user;
    showMainApp();
    saveData();
}

function handleLogout() {
    currentUser = null;
    localStorage.clear();
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('userAvatar').src = currentUser.avatar;
        document.getElementById('userName').textContent = currentUser.name;
    }
}

function showTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Content').classList.add('active');
}

function renderChats() {
    const chatsList = document.getElementById('chatsList');
    chatsList.innerHTML = '';
    
    chats.forEach(chat => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${chat.avatar}" alt="${chat.name}">
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-preview">${chat.lastMessage}</div>
            </div>
        `;
        li.addEventListener('click', () => openChat(chat));
        chatsList.appendChild(li);
    });
}

function renderFriends() {
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = '';
    
    friends.forEach(friend => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${friend.avatar}" alt="${friend.name}">
            <div class="friend-info">
                <div class="friend-name">${friend.name}</div>
                <div class="friend-status status-${friend.status}">${friend.status}</div>
            </div>
        `;
        li.addEventListener('click', () => openFriendChat(friend));
        friendsList.appendChild(li);
    });
}

function renderGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '';
    
    groups.forEach(group => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${group.avatar}" alt="${group.name}">
            <div class="chat-info">
                <div class="chat-name">${group.name}</div>
                <div class="chat-preview">${group.lastMessage}</div>
            </div>
        `;
        li.addEventListener('click', () => openGroupChat(group));
        groupsList.appendChild(li);
    });
}

function openChat(chat) {
    currentChat = chat;
    
    document.querySelectorAll('.chats-list li').forEach(li => li.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.getElementById('chatAvatar').src = chat.avatar;
    document.getElementById('chatTitle').textContent = chat.name;
    document.getElementById('chatStatus').textContent = chat.type === 'group' ? 'Group chat' : 'Direct message';
    
    loadMessages(chat.id);
}

function openFriendChat(friend) {
    let existingChat = chats.find(chat => chat.userId === friend.id);
    
    if (!existingChat) {
        const newChat = {
            id: 'chat_' + Date.now(),
            name: friend.name,
            avatar: friend.avatar,
            lastMessage: 'Start a conversation...',
            lastTime: new Date().toISOString(),
            type: 'dm',
            userId: friend.id
        };
        
        chats.unshift(newChat);
        messages[newChat.id] = [];
        saveData();
        renderChats();
        existingChat = newChat;
    }
    
    openChat(existingChat);
}

function openGroupChat(group) {
    let existingChat = chats.find(chat => chat.userId === group.id);
    
    if (!existingChat) {
        const newChat = {
            id: 'chat_' + Date.now(),
            name: group.name,
            avatar: group.avatar,
            lastMessage: 'Start a conversation...',
            lastTime: new Date().toISOString(),
            type: 'group',
            userId: group.id
        };
        
        chats.unshift(newChat);
        messages[newChat.id] = [];
        saveData();
        renderChats();
        existingChat = newChat;
    }
    
    openChat(existingChat);
}

function loadMessages(chatId) {
    const messagesList = document.getElementById('messagesList');
    const chatMessages = messages[chatId] || [];
    
    if (chatMessages.length === 0) {
        messagesList.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h2>Start the conversation!</h2>
                <p>Send a message to begin chatting</p>
            </div>
        `;
        return;
    }
    
    messagesList.innerHTML = '';
    
    chatMessages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.senderId === 'current' ? 'own' : ''}`;
        
        messageDiv.innerHTML = `
            <img src="${message.senderId === 'current' ? currentUser.avatar : getSenderAvatar(message.senderId)}" alt="${message.senderName}">
            <div class="message-content">
                <div class="message-text">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
        
        messagesList.appendChild(messageDiv);
    });
    
    scrollToBottom();
}

function getSenderAvatar(senderId) {
    if (senderId === 'current') return currentUser.avatar;
    
    const friend = friends.find(f => f.id === senderId);
    return friend ? friend.avatar : 'https://via.placeholder.com/32/888/ffffff?text=?';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString();
}

function scrollToBottom() {
    const messagesList = document.getElementById('messagesList');
    messagesList.scrollTop = messagesList.scrollHeight;
}

function handleMessageKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content || !currentChat) return;
    
    const message = {
        id: 'msg_' + Date.now(),
        senderId: 'current',
        senderName: 'You',
        content: content,
        timestamp: new Date().toISOString(),
        type: 'text'
    };
    
    if (!messages[currentChat.id]) {
        messages[currentChat.id] = [];
    }
    messages[currentChat.id].push(message);
    
    const chatIndex = chats.findIndex(chat => chat.id === currentChat.id);
    if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = content;
        chats[chatIndex].lastTime = message.timestamp;
    }
    
    const updatedChat = chats.splice(chatIndex, 1)[0];
    chats.unshift(updatedChat);
    
    saveData();
    renderChats();
    loadMessages(currentChat.id);
    
    messageInput.value = '';
    
    setTimeout(() => {
        simulateResponse();
    }, 1000 + Math.random() * 2000);
}

function simulateResponse() {
    if (!currentChat) return;
    
    const responses = [
        'That sounds great!',
        'I agree with you.',
        'Thanks for letting me know.',
        'Interesting point!',
        'I\'ll get back to you on that.',
        'Sounds good to me.',
        'Let me think about it.',
        'I\'m not sure about that.',
        'That\'s a good idea!',
        'I\'ll check on that.'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const senderId = currentChat.type === 'group' ? 
        (currentChat.userId === 'group1' ? 'user1' : 'user2') : 
        currentChat.userId;
    
    const sender = friends.find(f => f.id === senderId);
    const senderName = sender ? sender.name : 'Unknown';
    
    const message = {
        id: 'msg_' + Date.now(),
        senderId: senderId,
        senderName: senderName,
        content: randomResponse,
        timestamp: new Date().toISOString(),
        type: 'text'
    };
    
    if (!messages[currentChat.id]) {
        messages[currentChat.id] = [];
    }
    messages[currentChat.id].push(message);
    
    const chatIndex = chats.findIndex(chat => chat.id === currentChat.id);
    if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = randomResponse;
        chats[chatIndex].lastTime = message.timestamp;
    }
    
    const updatedChat = chats.splice(chatIndex, 1)[0];
    chats.unshift(updatedChat);
    
    saveData();
    renderChats();
    loadMessages(currentChat.id);
}

function showNewChatModal() {
    const modal = document.getElementById('newChatModal');
    const friendsList = document.getElementById('newChatFriends');
    
    friendsList.innerHTML = '';
    friends.forEach(friend => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${friend.avatar}" alt="${friend.name}">
            <div class="friend-name">${friend.name}</div>
        `;
        li.addEventListener('click', () => {
            openFriendChat(friend);
            closeModal('newChatModal');
        });
        friendsList.appendChild(li);
    });
    
    modal.classList.remove('hidden');
}

function showAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('hidden');
}

function showNewGroupModal() {
    const modal = document.getElementById('newGroupModal');
    const membersList = document.getElementById('groupMembersList');
    
    membersList.innerHTML = '';
    friends.forEach(friend => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${friend.avatar}" alt="${friend.name}">
            <div class="friend-name">${friend.name}</div>
        `;
        li.addEventListener('click', () => {
            li.classList.toggle('selected');
        });
        membersList.appendChild(li);
    });
    
    modal.classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) return;
    
    const newFriend = {
        id: 'user_' + Date.now(),
        name: username,
        username: username.toLowerCase(),
        avatar: 'https://via.placeholder.com/40/6366f1/ffffff?text=' + username.charAt(0).toUpperCase(),
        status: 'offline'
    };
    
    friends.push(newFriend);
    saveData();
    renderFriends();
    closeModal('addFriendModal');
    
    document.getElementById('friendUsername').value = '';
    
    alert('Friend request sent to ' + username);
}

function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const selectedMembers = document.querySelectorAll('#groupMembersList li.selected');
    
    if (!groupName || selectedMembers.length === 0) {
        alert('Please enter a group name and select at least one member');
        return;
    }
    
    const memberIds = Array.from(selectedMembers).map(li => {
        const friendName = li.querySelector('.friend-name').textContent;
        return friends.find(f => f.name === friendName).id;
    });
    
    const newGroup = {
        id: 'group_' + Date.now(),
        name: groupName,
        avatar: 'https://via.placeholder.com/40/8b5cf6/ffffff?text=' + groupName.charAt(0).toUpperCase(),
        members: memberIds,
        lastMessage: 'Group created',
        lastTime: new Date().toISOString()
    };
    
    groups.push(newGroup);
    saveData();
    renderGroups();
    closeModal('newGroupModal');
    
    document.getElementById('groupName').value = '';
    document.querySelectorAll('#groupMembersList li').forEach(li => li.classList.remove('selected'));
    
    alert('Group "' + groupName + '" created successfully!');
}

function showChatInfo() {
    if (!currentChat) return;
    alert('Chat Info:\nName: ' + currentChat.name + '\nType: ' + currentChat.type);
}

function showChatSettings() {
    if (!currentChat) return;
    alert('Chat Settings:\nNotifications: On\nTheme: Dark\nLanguage: English');
}

function showAttachMenu() {
    alert('Attach menu would open here\n- Photos\n- Files\n- Location\n- Contact');
}

function showEmojiPicker() {
    alert('Emoji picker would open here');
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        filterChats(query);
    });
    
    const newChatSearch = document.getElementById('newChatSearch');
    if (newChatSearch) {
        newChatSearch.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            filterNewChatFriends(query);
        });
    }
}

function filterChats(query) {
    const chatsList = document.getElementById('chatsList');
    const chatItems = chatsList.querySelectorAll('li');
    
    chatItems.forEach(item => {
        const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
        const chatPreview = item.querySelector('.chat-preview').textContent.toLowerCase();
        
        if (chatName.includes(query) || chatPreview.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterNewChatFriends(query) {
    const friendsList = document.getElementById('newChatFriends');
    const friendItems = friendsList.querySelectorAll('li');
    
    friendItems.forEach(item => {
        const friendName = item.querySelector('.friend-name').textContent.toLowerCase();
        
        if (friendName.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}
