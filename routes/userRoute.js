const express = require('express');
const { register, login } = require('../controller/auth');
const { 
    createGroup, 
    addMembers, 
    getContacts, 
    getMessages, 
    allUsers, 
    newChat,
    getGroupMessages
} = require('../controller/userController');
const { verifyToken } = require('../utils/verifyToken');
const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.post('/group',verifyToken,createGroup);
router.post('/members',verifyToken,addMembers);

router.post('/chats',verifyToken,getContacts);
router.post('/messages',verifyToken,getMessages);
router.post('/contacts',verifyToken,allUsers);
router.post('/newchat',verifyToken,newChat);
router.post('/groupmessages',verifyToken,getGroupMessages);

module.exports=router;