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
            createdBy:req["userId"],
            members: [req["userId"]]
        })
        await newGroup.save();
        res.status(201).json({ message: `Group ${name} created`, groupId:newGroup["_id"] });
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
        const { userId } = req.body;
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
            }
        ]);
        const userGroups = await Group.aggregate([
            {
                '$match': {
                    'members': {
                        '$in': [new mongoose.Types.ObjectId(userId)]
                    }
                }
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
                    'receiver': '$receiver.name'
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
                    'groupId':groupId
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
            }
        ]);
        res.status(200).json({ data: groupChat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const updateUserProfile = async(req,res) => {
    try {
        const user = await User.findById(req['userId']);
        if(!user){
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