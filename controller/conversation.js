const url = require('url');
const WebSocket = require('ws');
const User = require('../models/users');
const Group = require('../models/group');
const GroupChat = require('../models/groupChat');
const IndividualChat = require('../models/personalChat');

const connections = {}; // Stores active WebSocket connections per user

const handleMessage = async (bytes, userId, chatType, chatId) => {
    try {
        const messageData = JSON.parse(bytes.toString());

        const newMessage = {
            sender: userId,
            text: messageData.text,
        };

        if (chatType === 'group') {
            let chat = await GroupChat.findOneAndUpdate(
                { groupId: chatId },
                { $push: { messages: newMessage } },
                { new: true, upsert: true }
            );
            const groupData = await Group.findById(chatId).lean();
            if (groupData) {
                const memberIds = groupData.members.map(member => member.toString());
                broadcastGroup(chatId, newMessage, memberIds);
            }
        } else if (chatType === 'single') {
            let chatMembers = chatId.split('-');
            let receiver = chatMembers.find(member => member !== userId);

            let chat = await IndividualChat.findOneAndUpdate(
                { chatId },
                { $push: { messages: newMessage }, $addToSet: { participants: [userId, receiver] } },
                { new: true, upsert: true }
            );
            sendToUser(userId, receiver, chatId, newMessage);
        }
    } catch (error) {
        console.error("Error handling message:", error);
    }
};

const handleClose = (userId,chatId) => {
    console.log(`User ${userId} disconnected`);
    if (connections[`${userId}_${chatId}`]) {
        delete connections[`${userId}_${chatId}`];
    }
};

const broadcastGroup = async (groupId, message, members) => {
    members.forEach(memberId => {
        if (connections[`${memberId}_${groupId}`]) {
            try {
                connections[`${memberId}_${groupId}`].send(JSON.stringify({ type: 'group', groupId, message }));
            } catch (error) {
                console.error(`Error sending message to ${memberId}:`, error);
            }
        }
    });
};

const sendToUser = async (senderId, receiverId, chatId, message) => {
    [senderId, receiverId].forEach(userId => {
        if (connections[`${userId}_${chatId}`]) {
            try {
                connections[`${userId}_${chatId}`].send(JSON.stringify({ type: 'single', chatId, message }));
            } catch (error) {
                console.error(`Error sending message to ${userId}:`, error);
            }
        }
    });
};

const handleConnection = async (ws, request) => {
    try {
        const { chatId, type, userId } = url.parse(request.url, true).query;

        console.log(`User ${userId} connected to ${type} chat with chatId: ${chatId}`);
        connections[`${userId}_${chatId}`] = ws;

        let chatHistory = [];

        if (type === 'group') {
            let chat = await GroupChat.findOne({ groupId: chatId }).populate('messages');
            chatHistory = chat ? chat.messages : [];
        } else if (type === 'single') {
            let chat = await IndividualChat.findOne({ chatId }).populate('messages.sender participants');
            chatHistory = chat ? chat.messages : [];
        }

        ws.send(JSON.stringify({ type, chatId, messages: chatHistory }));

        ws.on('message', message => handleMessage(message, userId, type, chatId));
        ws.on('close', () => handleClose(userId,chatId));
        ws.on('error', (err) => {
            console.error(`WebSocket error for user ${userId}:`, err);
        });
    } catch (error) {
        console.error("Error handling connection:", error);
    }
};

module.exports = { handleConnection };
