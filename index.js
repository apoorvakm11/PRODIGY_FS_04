const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const users = new Map();  // Keep track of logged-in users
const chatHistory = new Map();  // Store chat history by room

io.on('connection', (socket) => {
    let username = '';
    let currentRoom = '';
    let recipient = '';

    // Handle login
    socket.on('login', (user) => {
        if (users.has(user)) {
            socket.emit('loginError', 'Username is already taken. Please choose another one.');
        } else {
            username = user;
            users.set(username, socket.id);
            console.log(`${username} logged in`);
            io.emit('userCount', users.size);  // Broadcast the user count to all clients
        }
    });

    // Handle typing notifications
    socket.on('typing', (isTyping) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('typing', { username, isTyping });
        }
    });

    // Handle private chat initiation
    socket.on('privateChat', (recipientName) => {
        recipient = recipientName.trim();
        if (users.has(recipient)) {
            if (currentRoom) {
                socket.leave(currentRoom);  // Leave any existing room
            }
            const recipientSocketId = users.get(recipient);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('startPrivateChat', username);
                console.log(`${username} started a private chat with ${recipient}`);
                currentRoom = '';  // Clear room since we're in private chat mode
            }
        } else {
            socket.emit('privateChatError', `User ${recipient} not found.`);
        }
    });

    // Handle joining rooms
    socket.on('joinRoom', (roomName) => {
        if (currentRoom) {
            socket.leave(currentRoom);  // Leave the previous room
        }
        socket.join(roomName);
        currentRoom = roomName;
        console.log(`${username} joined room ${roomName}`);

        // Send chat history to the user joining the room
        if (chatHistory.has(currentRoom)) {
            const messageHistory = chatHistory.get(currentRoom);
            socket.emit('messageHistory', messageHistory);
        }
    });

    // Handle chat messages (public or private)
    socket.on('chatMessage', (message) => {
        if (currentRoom) {
            // Public room message
            if (!chatHistory.has(currentRoom)) {
                chatHistory.set(currentRoom, []);
            }
            chatHistory.get(currentRoom).push({ user: username, message });
            io.to(currentRoom).emit('chatMessage', `${username}: ${message}`);
        } else if (recipient) {
            // Private message
            const recipientSocketId = users.get(recipient);
            const senderSocketId = users.get(username);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chatMessage', `(Private) ${username}: ${message}`);
                io.to(senderSocketId).emit('chatMessage', `(Private) ${username}: ${message}`);
            }
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log(`${username} disconnected`);
        users.delete(username);
        io.emit('userCount', users.size);

        if (currentRoom) {
            socket.to(currentRoom).emit('typing', { username, isTyping: false });
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
