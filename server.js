const http = require('http');
const express = require('express');
const app = express();
const { WebSocketServer } = require('ws');
// const { handleConnection } = require('./controller/chatHandler');
const authRoute = require('./routes/userRoute');
const connection = require('./config/db');
const cors = require('cors');
const { handleConnection } = require('./controller/conversation');

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

app.use(express.json());
app.use(cors());
app.use('/',authRoute);


wsServer.on('connection', handleConnection);

server.listen(4000, async() => {
    await connection()
    console.log(`WebSocket server running on port 4000`);
});
