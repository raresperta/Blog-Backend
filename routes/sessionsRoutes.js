const express = require("express");

const router = express.Router();

const {
  getSessions,
  uploadVideo,
  checkVideoDate,
  editVideo,
  deleteVideo
} = require("../controllers/sessionsController");

const upload = require("../middleware/upload");

router.get("/", getSessions);

router.post(
  "/upload-video",
  upload.single("video"),
  uploadVideo
);

router.post(
  "/check-video-date",
  upload.single("video"),
  checkVideoDate
);

router.patch(
  "/videos/:id",
  editVideo
);

router.delete(
  "/videos/:id",
  deleteVideo
);

module.exports = router;