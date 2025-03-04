const fs = require('fs');

const fileToBase64 = (file) => {
    try {
        const fileBuffer = fs.readFileSync(file.path);
        const base64String = fileBuffer.toString('base64');        
        return `data:${file.mimetype};base64,${base64String}`;
    } catch (error) {
        console.error("Error converting file to Base64:", error);
        throw new Error("File conversion to Base64 failed");
    }
};

module.exports = { 
    fileToBase64 
};