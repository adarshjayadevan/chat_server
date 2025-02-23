const url = require('url');
const WebSocket = require('ws');
const User = require('../models/users');
const GroupChat = require('../models/groupChat');
const IndividualChat = require('../models/personalChat');

const connections = {};

const handleMessage = async (bytes, userId, chatType, chatId) => {
    const messageData = JSON.parse(bytes.toString());

    const newMessage = {
        sender: userId,
        text: messageData.text,
    };

    if (chatType === 'group') {
        let chat = await GroupChat.findOneAndUpdate(
            { groupId: chatId },
            {
                sender: userId,
                $push: { messages: newMessage }
            },
            { new: true, upsert: true }
        );
        broadcastGroup(chatId, newMessage);
    } else if (chatType === 'single') {
        let chatMembers = chatId.split('-');
        let receiver = chatMembers.filter(member => member != userId)
        let chat = await IndividualChat.findOneAndUpdate(
            { chatId },
            { $push: { messages: newMessage }, $addToSet: { participants: [userId, receiver[0]] } },
            { new: true, upsert: true }
        );
        const chatMessages = await IndividualChat.findOne({chatId}).lean();
        const lastMessage = chatMessages.messages[chatMessages.messages.length-1]
        sendToUser(chatId, lastMessage);
    }
};

const handleClose = (userId) => {
    console.log(`User ${userId} disconnected`);
    delete connections[userId];
};

const broadcastGroup = async (groupId, message) => {
    Object.values(connections).forEach(connection => {
        connection.send(JSON.stringify({ type: 'group', groupId, message }));
    });
};

const sendToUser = async (chatId, message) => {
    Object.keys(connections).forEach(userId => {
        connections[userId].send(JSON.stringify({ type: 'single', chatId, message }));
    });
};

const handleConnection = async (ws, request) => {
    const { chatId, type, userId } = url.parse(request.url, true).query;

    console.log(`User ${userId} connected to ${type} chat with chatId: ${chatId}`);
    connections[userId] = ws;

    let chatHistory = [];

    if (type === 'group') {
        chatHistory = await GroupChat.findOne({ groupId: chatId }).populate('messages');
    } else if (type === 'single') {
        chatHistory = await IndividualChat.findOne({ chatId }).populate('messages.sender participants');
    }

    ws.send(JSON.stringify({ type, chatId, messages: chatHistory ? chatHistory.messages : [] }));

    ws.on('message', message => handleMessage(message, userId, type, chatId));
    ws.on('close', () => handleClose(userId));
};

module.exports = { handleConnection };
