const Group = require('../models/group');
const IndividualChat = require('../models/personalChat');
const GroupChat = require('../models/groupChat');
const User = require('../models/users');
const mongoose = require('mongoose');
const { fileToBase64 } = require('../utils/fileConverter');

const allUsers = async (req, res) => {
    try {
        const { userId } = req.body;
        const users = await User.aggregate([
            {
                '$match': {
                    '_id': {
                        '$ne': new mongoose.Types.ObjectId(userId)
                    }
                }
            }, {
                '$lookup': {
                    'from': 'singleconversations',
                    'let': {
                        'userId': '$_id'
                    },
                    'pipeline': [
                        {
                            '$match': {
                                '$expr': {
                                    '$in': [
                                        '$$userId', '$participants'
                                    ]
                                }
                            }
                        }, {
                            '$match': {
                                '$expr': {
                                    '$in': [
                                        new mongoose.Types.ObjectId(userId), '$participants'
                                    ]
                                }
                            }
                        }, {
                            '$project': {
                                'chatId': 1,
                                '_id': 1
                            }
                        }
                    ],
                    'as': 'chatInfo'
                }
            }, {
                '$addFields': {
                    'chatId': {
                        '$ifNull': [
                            {
                                '$arrayElemAt': [
                                    '$chatInfo.chatId', 0
                                ]
                            }, null
                        ]
                    },
                    'conversationId': {
                        '$ifNull': [
                            {
                                '$arrayElemAt': [
                                    '$chatInfo._id', 0
                                ]
                            }, null
                        ]
                    }
                }
            }, {
                '$project': {
                    'chatInfo': 0,
                    'password': 0
                }
            }
        ])
        res.status(200).json({ data: users });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const createGroup = async (req, res) => {
    try {
        const { name, createdBy } = req.body;
        const newGroup = new Group({
            name,
            createdBy: req["userId"],
            members: [req["userId"]]
        })
        await newGroup.save();
        const newGroupConversation = new GroupChat({
            groupId: newGroup["_doc"]._id.toString(),
            groupName: name,
            messages: []
        })
        await newGroupConversation.save()
        res.status(201).json({ message: `Group ${name} created`, groupId: newGroup["_id"] });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const addMembers = async (req, res) => {
    try {
        const { groupId, members } = req.body;
        const membersArray = members.map(id => new mongoose.Types.ObjectId(id));
        await Group.updateOne(
            { _id: groupId },
            { $addToSet: { members: { $each: membersArray } } }
        )
        res.status(200).json({ message: `Group Updated` });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const getContacts = async (req, res) => {
    try {
        const { userId, search } = req.body;
        let nameMatch = {};
        let groupMatch = {};
        if (search && search != '') {
            nameMatch = {
                receiver: { $regex: search, $options: "i" }
            }
            groupMatch = {
                name: { $regex: search, $options: "i" }
            }
        }
        const userChats = await IndividualChat.aggregate([
            {
                '$match': {
                    'participants': {
                        '$in': [
                            new mongoose.Types.ObjectId(userId)
                        ]
                    }
                }
            }, {
                '$unwind': {
                    'path': '$participants'
                }
            }, {
                '$match': {
                    'participants': {
                        '$ne': new mongoose.Types.ObjectId(userId)
                    }
                }
            }, {
                '$lookup': {
                    'from': 'users',
                    'localField': 'participants',
                    'foreignField': '_id',
                    'as': 'receiver'
                }
            }, {
                '$unwind': {
                    'path': '$receiver'
                }
            }, {
                '$addFields': {
                    'receiverId': {
                        '$toString': '$receiver._id'
                    },
                    'receiverImage': '$receiver.profileImage',
                    'receiver': '$receiver.name',
                    'messages': { '$arrayElemAt': ["$messages", -1] }
                }
            }, {
                '$lookup': {
                    'from': 'messages',
                    'localField': 'messages.messageId',
                    'foreignField': '_id',
                    'as': 'result'
                }
            }, {
                '$unwind': {
                    'path': '$result'
                }
            }, {
                '$addFields': {
                    'dynamicKey': {
                        '$arrayToObject': [
                            [
                                {
                                    'k': '$messages.type',
                                    'v': '$result.message'
                                }
                            ]
                        ]
                    }
                }
            },
            // {
            //     '$addFields': {
            //         'messages.text': '$result.message',
            //         'result': '$$REMOVE'
            //     }
            // },
            {
                '$project':{
                    'messages': {
                        '$mergeObjects': [
                            '$messages', '$dynamicKey'
                        ]
                    },
                    'chatId':1,
                    'participants':1,
                    'receiver':1,
                    'receiverId':1,
                    'receiverImage':1
                }
            }, {
                '$match': nameMatch
            }
        ]);
        const userGroups = await Group.aggregate([
            {
                '$match': {
                    'members': {
                        '$in': [new mongoose.Types.ObjectId(userId)]
                    }
                }
            }, {
                '$match': groupMatch
            }
        ])
        res.status(200).json({ data: [...userChats, ...userGroups] });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const getMessages = async (req, res) => {
    try {
        const { chatId, userId } = req.body;
        const userChat = await IndividualChat.aggregate([
            {
                '$match': {
                    '_id': new mongoose.Types.ObjectId(chatId)
                }
            },
            {
                '$unwind': {
                    'path': '$participants'
                }
            },
            {
                '$match': {
                    'participants': {
                        '$ne': new mongoose.Types.ObjectId(userId)
                    }
                }
            },
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'participants',
                    'foreignField': '_id',
                    'as': 'receiver'
                }
            },
            {
                '$unwind': {
                    'path': '$receiver'
                }
            },
            {
                '$addFields': {
                    'receiverId': {
                        '$toString': '$receiver._id'
                    },
                    'receiverImage': '$receiver.profileImage',
                    'receiver': '$receiver.name'
                }
            },
            {
                '$unwind': {
                    'path': '$messages',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                '$lookup': {
                    'from': 'messages',
                    'localField': 'messages.messageId',
                    'foreignField': '_id',
                    'as': 'messageDetails'
                }
            },
            {
                '$unwind': {
                    'path': '$messageDetails',
                    'preserveNullAndEmptyArrays': true
                }
            },
            // {
            //     '$addFields': {
            //         'messages.text': '$messageDetails.message',  // Assuming messages collection has a 'text' field
            //         'messages.attachments': '$messageDetails.attachments' // If there are any attachments in messages
            //     }
            // },
            {
                '$addFields': {
                    'messages.message': '$messageDetails.message',
                    'dynamicKey': {
                        '$arrayToObject': [
                            [
                                {
                                    'k': '$messages.type',
                                    'v': '$messageDetails.message'
                                }
                            ]
                        ]
                    }
                }
            }, {
                '$project': {
                    'messages': {
                        '$mergeObjects': [
                            '$messages', '$dynamicKey'
                        ]
                    },
                    'chatId': 1,
                    'participants': 1,
                    'receiver': 1,
                    'receiverId': 1,
                    'receiverImage': 1,
                    'receiverImage': 1,
                    'messageDetails': 1
                }
            },
            {
                '$group': {
                    '_id': '$_id',
                    'chatId': { '$first': '$chatId' },
                    'participants': { '$first': '$participants' },
                    'receiverId': { '$first': '$receiverId' },
                    'receiverImage': { '$first': '$receiverImage' },
                    'receiver': { '$first': '$receiver' },
                    'messages': { '$push': '$messages' } // Grouping messages back into an array
                }
            }
        ]);

        res.status(200).json({ data: userChat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const newChat = async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        const existingConversation = await IndividualChat.aggregate([
            {
                '$match': {
                    'participants': {
                        '$all': [
                            new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(friendId)
                        ]
                    }
                }
            }
        ])
        // console.log(existingConversation);
        if (existingConversation.length > 0) {
            return res.status(401).json({ message: `Conversation Exists` });
        }
        const newConversation = new IndividualChat({
            chatId: `${userId}-${friendId}`,
            messages: [],
            participants: [new mongoose.Types.ObjectId(userId), new mongoose.Types.ObjectId(friendId)]
        })
        await newConversation.save();
        console.log(newConversation);
        res.status(200).json({ data: newConversation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.body;
        const groupChat = await GroupChat.aggregate([
            {
                '$match': {
                    'groupId': groupId
                }
            }, {
                '$addFields': {
                    'groupId': {
                        '$toObjectId': '$groupId'
                    }
                }
            }, {
                '$lookup': {
                    'from': 'groups',
                    'localField': 'groupId',
                    'foreignField': '_id',
                    'as': 'group'
                }
            }, {
                '$unwind': {
                    'path': '$group'
                }
            }, {
                '$lookup': {
                    'from': 'users',
                    'localField': 'group.members',
                    'foreignField': '_id',
                    'as': 'members'
                }
            }, {
                '$unwind': {
                    'path': '$messages',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                '$lookup': {
                    'from': 'messages',
                    'localField': 'messages.messageId',
                    'foreignField': '_id',
                    'as': 'messageDetails'
                }
            },
            {
                '$unwind': {
                    'path': '$messageDetails',
                    'preserveNullAndEmptyArrays': true
                }
            },
            // {
            //     '$addFields': {
            //         'messages.text': '$messageDetails.message',  // Assuming messages collection has a 'text' field
            //         'messages.attachments': '$messageDetails.attachments' // If there are any attachments in messages
            //     }
            // }, 
            {
                '$addFields': {
                    'messages.message': '$messageDetails.message',
                    'dynamicKey': {
                        '$arrayToObject': [
                            [
                                {
                                    'k': '$messages.type',
                                    'v': '$messageDetails.message'
                                }
                            ]
                        ]
                    }
                }
            }, {
                '$project': {
                    'messages': {
                        '$mergeObjects': [
                            '$messages', '$dynamicKey'
                        ]
                    },
                    'chatId': 1,
                    'group': 1,
                    'groupId': 1,
                    'members': 1,
                }
            },
            {
                '$group': {
                    '_id': '$_id',
                    'group': { '$first': '$group' },
                    'groupId': { '$first': '$groupId' },
                    'members': { '$first': '$members' },
                    'messages': { '$push': '$messages' }
                }
            }
        ]);
        res.status(200).json({ data: groupChat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req['userId']);
        if (!user) {
            return res.status(400).json({ message: `User does not exist` });
        }
        let fileString;
        if (req.file) {
            fileString = fileToBase64(req.file);
        }
        const updatedUser = await User.findOneAndUpdate({ _id: req['userId'] }, {
            $set: {
                profileImage: req.file ? fileString : user.profileImage
            }
        }, { new: true })
        res.status(201).json({ message: `User Updated`, image: updatedUser.profileImage })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createGroup,
    addMembers,
    getContacts,
    getMessages,
    allUsers,
    newChat,
    getGroupMessages,
    updateUserProfile,
}