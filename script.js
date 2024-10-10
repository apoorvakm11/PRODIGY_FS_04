const socket = io();
let username = '';
let currentRoom = '';
let recipient = '';

// Login to chat
function login() {
    const user = document.getElementById('username').value.trim();
    if (user) {
        socket.emit('login', user);
        socket.on('loginError', (error) => {
            document.getElementById('login-error').textContent = error;
        });

        socket.on('userCount', (count) => {
            document.getElementById('user-count').textContent = `Users connected: ${count}`;
        });
    }
}

// Join a room
function joinRoom() {
    const room = document.getElementById('roomName').value.trim();
    if (room) {
        socket.emit('joinRoom', room);
        currentRoom = room;
        document.getElementById('current-room').textContent = `Current Room: ${room}`;

        socket.on('messageHistory', (history) => {
            const messages = document.getElementById('messages');
            messages.innerHTML = ''; // Clear messages before loading history
            history.forEach((msg) => {
                const li = document.createElement('li');
                li.textContent = `${msg.user}: ${msg.message}`;
                messages.appendChild(li);
            });
        });
    }
}

// Start a private chat
function startPrivateChat() {
    recipient = document.getElementById('recipient').value.trim();
    if (recipient) {
        socket.emit('privateChat', recipient);
        socket.on('privateChatError', (error) => {
            document.getElementById('private-error').textContent = error;
        });

        socket.on('startPrivateChat', (otherUser) => {
            console.log(`Private chat started with ${otherUser}`);
            recipient = otherUser;
        });
    }
}

// Send a chat message
function sendMessage() {
    const message = document.getElementById('message').value.trim();
    if (message) {
        socket.emit('chatMessage', message);
        document.getElementById('message').value = ''; // Clear message input
    }
}

// Display incoming chat messages
socket.on('chatMessage', (message) => {
    const messages = document.getElementById('messages');
    const li = document.createElement('li');
    li.textContent = message;
    messages.appendChild(li);
});

// Handle typing notifications
function typing() {
    socket.emit('typing', true);
    setTimeout(() => {
        socket.emit('typing', false);
    }, 1000);
}

socket.on('typing', (data) => {
    const messages = document.getElementById('messages');
    let typingNotice = document.getElementById('typingNotice');
    if (!typingNotice) {
        typingNotice = document.createElement('li');
        typingNotice.id = 'typingNotice';
        messages.appendChild(typingNotice);
    }
    typingNotice.textContent = data.isTyping ? `${data.username} is typing...` : '';
});

// After login, show chat and hide login form
socket.on('userCount', () => {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
});
