const url = require('url');
const uuidv4 = require('uuid').v4;

const connections = {}; 
const users = {}; 
const messages = { groups: {}, individuals: {} };

const handleMessage = (bytes, uuid, chatType, chatId) => {
    const messageData = JSON.parse(bytes.toString());
    const sender = users[uuid];

    if (chatType === 'group') {
        if (!messages.groups[chatId]) messages.groups[chatId] = [];
        messages.groups[chatId].push({ sender: sender.username, text: messageData.text, timestamp: Date.now() });
        broadcastGroup(chatId);
    } else if (chatType === 'single') {
        if (!messages.individuals[chatId]) messages.individuals[chatId] = [];
        messages.individuals[chatId].push({ sender: sender.username, text: messageData.text, timestamp: Date.now() });
        sendToUser(chatId);
    }
};

const handleClose = (uuid) => {
    console.log(`${users[uuid].username} disconnected`);
    delete users[uuid];
    delete connections[uuid];
};

const broadcastGroup = (groupId) => {
    Object.values(connections).forEach(connection => {
        connection.send(JSON.stringify({ type: 'group', chatId: groupId, messages: messages.groups[groupId] }));
    });
};

const sendToUser = (chatId) => {
    const [user1, user2] = chatId.split('-');

    Object.keys(connections).forEach(uuid => {
        if (users[uuid] && (users[uuid].username === user1 || users[uuid].username === user2)) {
            connections[uuid].send(JSON.stringify({
                type: 'single',
                chatId,
                messages: messages.individuals[chatId]
            }));
        }
    });
};

const handleConnection = (connection, request) => {
    const { username, type, chatId } = url.parse(request.url, true).query;
    const uuid = uuidv4();
    console.log(`${username} connected with type ${type} and chatId ${chatId}`);

    connections[uuid] = connection;
    users[uuid] = { username };

    if (type === 'group') {
        if (!messages.groups[chatId]) messages.groups[chatId] = [];
        connection.send(JSON.stringify({ type: 'group', chatId, messages: messages.groups[chatId] }));
    } else if (type === 'single') {
        if (!messages.individuals[chatId]) messages.individuals[chatId] = [];
        connection.send(JSON.stringify({ type: 'single', chatId, messages: messages.individuals[chatId] }));
    }

    connection.on('message', message => handleMessage(message, uuid, type, chatId));
    connection.on('close', () => handleClose(uuid));
};

module.exports = { handleConnection };
