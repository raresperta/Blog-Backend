const express = require("express");
const router = express.Router();

const upload = require("../middleware/learningUpload");

const {
  getLearningSongs,
  addLearningSong,
  updateLearningSong,
  uploadPdf,
  addSongFromYoutube,
  deleteLearningSong,
} = require("../controllers/learningController");

router.get("/", getLearningSongs);
router.post("/youtube", addSongFromYoutube);

router.post(
  "/",
  upload.fields([
    { name: "coverImage", maxCount: 1 }
  ]),
  addLearningSong
);

router.put("/:id", updateLearningSong);

router.post(
  "/:id/pdf",
  upload.fields([
    { name: "tabPdf", maxCount: 1 }
  ]),
  uploadPdf
);

router.delete("/:id", deleteLearningSong);

module.exports = router;