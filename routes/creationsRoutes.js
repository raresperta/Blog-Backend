const express = require("express");
const router = express.Router();

const upload = require("../middleware/creationsUpload");

const {
  getSongs,
  addSong,
  deleteCreation
} = require("../controllers/creationsController");

router.get("/", getSongs);

router.post(
  "/",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "audioFile", maxCount: 1 }
  ]),
  addSong
);
router.delete("/creations/:id", deleteCreation);
module.exports = router;