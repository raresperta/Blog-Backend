const express = require("express");
const { addArtwork, getArtworks, updateArtwork } = require("../controllers/artworksController");

const router = express.Router();

router.get("/", getArtworks);
router.post("/", addArtwork);
router.patch("/:id", updateArtwork);

module.exports = router;
