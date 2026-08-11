const fs = require("fs");
const multer = require("multer");
const path = require("path");

const artworkDirectory = path.join(__dirname, "../uploads/artworks");
fs.mkdirSync(artworkDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, artworkDirectory);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    cb(null, file.mimetype.startsWith("image/"));
  },
});
