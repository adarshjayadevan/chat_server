const http = require('http');
const express = require('express');
const app = express();
const { WebSocketServer } = require('ws');
// const { handleConnection } = require('./controller/chatHandler');
const authRoute = require('./routes/userRoute');
const connection = require('./config/db');
const cors = require('cors');
const { handleConnection } = require('./controller/conversation');
const path = require('path');

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

app.use(express.json());
app.use(cors());
app.use('/',authRoute);

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

wsServer.on('connection', handleConnection);

server.listen(4000, async() => {
    await connection()
    console.log(`WebSocket server running on port 4000`);
});
