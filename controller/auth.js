const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const register = async(req,res) => {
    try {
        let {name,password,mobile} = req.body;
        let userExist = await User.findOne({ mobile });
        if (userExist) return res.status(203).json({ message: `User Already Registered` })
        const salt = bcrypt.genSaltSync(10);
        password = bcrypt.hashSync(password, salt);
        const newUser = new User({
            name,
            password,
            mobile
        })
        await newUser.save();
        res.status(201).json({status:true, message: `user registered` })
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}

const login = async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await User.findOne({ name });
        if (!user) return res.status(400).json({ message: `User Does Not Exist` });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'invalid email or password' });
        const token = jwt.sign({ user:true, id: user._id, name: user.name, mobile: user.mobile }, process.env.SECRET,{ expiresIn: "10h" });
        res.status(200).json({ status:true, message: 'login successful', token, profileImage:user.profileImage })
    } catch (error) {
        res.status(500).json({ message: `Error -> ${error.message}` })
    }
}

module.exports={
    register,
    login
}