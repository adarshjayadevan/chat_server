const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env')})

const verifyToken =async(req,res,next)=>{
    try {
        if(!req.headers['authorization']){
            return res.status(401).json({ message: `Unauthorized` });
        }
        const token = req.headers['authorization'].split(' ')[1];
        const decoded=jwt.verify(token, process.env.SECRET);
        if(decoded.user){
            next();
        }    
        else {
            return res.status(401).json({ message: `Unauthorized` });
        } 
    } catch (error) {
        console.log(`error=> ${error.message}`);
        return res.status(401).json({ message: `Authorization failed due to ${error.message}` })
    }
}


module.exports={
    verifyToken
}