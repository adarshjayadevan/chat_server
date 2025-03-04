const express = require('express');
const { register, login } = require('../controller/auth');
const { 
    createGroup, 
    addMembers, 
    getContacts, 
    getMessages, 
    allUsers, 
    newChat,
    getGroupMessages,
    updateUserProfile
} = require('../controller/userController');
const { verifyToken } = require('../utils/verifyToken');
const { imageUpload } = require('../config/multer');
const router = express.Router();

// router.get('/',(req,res)=>{
//     res.send(`CHAT SERVER`);
// })

router.post('/register',register);
router.post('/login',login);
router.post('/group',verifyToken,createGroup);
router.post('/members',verifyToken,addMembers);

router.post('/chats',verifyToken,getContacts);
router.post('/messages',verifyToken,getMessages);
router.post('/contacts',verifyToken,allUsers);
router.post('/newchat',verifyToken,newChat);
router.post('/groupmessages',verifyToken,getGroupMessages);
router.put('/profile',verifyToken,(req,res,next)=>{
    imageUpload.single('image')(req,res,(err)=>{
        if(err){
            if (err.message === "Unsupported file type. Only .jpg, .jpeg, and .png files are allowed.") {
                return res.status(400).json({ message: err.message });
            }
            return res.status(400).json({ message: 'An error occured during file upload' });
        }
        next();
    })
},updateUserProfile);

module.exports=router;