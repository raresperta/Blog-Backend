const express = require("express");

const router = express.Router();

const {
  getSongs,
  addSong
} = require("../controllers/songsController");

router.get("/", getSongs);

router.post("/", addSong);

module.exports = router;