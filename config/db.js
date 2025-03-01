const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env')});

const conn = async()=> {
    try {
        await mongoose.connect(process.env.MONGO_URL).then(respo=>{
            console.log(`Database connected`)
        })
    } catch (error) {
        console.log('Database not connected')
    }
}

module.exports=conn;