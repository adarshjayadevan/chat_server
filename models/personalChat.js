const mongoose = require('mongoose');

const individualChatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true }, // User1ID-User2ID
    participants: [{ type: mongoose.Schema.Types.ObjectId }], // Chat participants
    messages: [{
        sender: { type: mongoose.Schema.Types.ObjectId},
        text: String,
        timestamp: { type: Date, default: ()=>new Date() }
    }]
});

module.exports=mongoose.model('singleConversations',individualChatSchema);