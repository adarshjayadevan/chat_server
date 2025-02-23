const mongoose = require('mongoose');

const groupChatSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    groupName: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId },
    messages: [{
        sender: { type: mongoose.Schema.Types.ObjectId },
        text: String,
        timestamp: { type: Date, default: ()=>new Date() }
    }]
});

module.exports=mongoose.model('groupConversations',groupChatSchema);