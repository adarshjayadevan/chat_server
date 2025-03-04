const multer = require('multer');
const path = require('path');

const imageUpload = multer({
    storage: multer.diskStorage({}),
    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
            const error = new Error("Unsupported file type. Only .jpg, .jpeg, and .png files are allowed.");
            error.status = 400;
            cb(error);
            return;
        }
        cb(null, true);
    }
});

const documentUpload = multer({
    storage: multer.memoryStorage({}),
    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".pdf" && ext !== ".doc" && ext !== ".docx" && ext !== ".xlsx") {
            const error = new Error("File type is not supported. Only .pdf, .doc, .docx, and .xlsx files are allowed.");
            error.status = 400;
            cb(error);
            return;
        }
        cb(null, true);
    }
});

module.exports = { 
    imageUpload, 
    documentUpload 
};