const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === "coverImage") {
      cb(null, path.join(__dirname, "../uploads/covers"));
    } else if (file.fieldname === "audioFile") {
      cb(null, path.join(__dirname, "../uploads/audio"));
    }
  },

  filename(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

module.exports = multer({ storage });