const mongoose = require('mongoose');

const conn = async()=> {
    try {
        await mongoose.connect(`mongodb://127.0.0.1:27017/chat`).then(respo=>{
            console.log(`Database connected`)
        })
    } catch (error) {
        console.log('Database not connected')
    }
}

module.exports=conn;