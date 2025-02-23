const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    members: [{ type: mongoose.Schema.Types.ObjectId }],
    createdAt: {
        type: Date,
        default: () => new Date()
    }
})

module.exports = mongoose.model('group', groupSchema);