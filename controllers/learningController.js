const fs = require("fs");
const path = require("path");
const axios = require("axios");


function getLearningPath() {
  return path.join(__dirname, "../data/learning.json");
}

function readLearning() {
  return JSON.parse(
    fs.readFileSync(getLearningPath(), "utf8")
  );
}

function saveLearning(data) {
  fs.writeFileSync(
    getLearningPath(),
    JSON.stringify(data, null, 2)
  );
}

/* -------------------- */
/* GET */
/* -------------------- */

exports.getLearningSongs = (req, res) => {
  try {
    const songs = readLearning();
    res.json(songs);
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

/* -------------------- */
/* CREATE SONG */
/* -------------------- */

exports.addLearningSong = (req, res) => {
  try {
    const { title, artist } = req.body;

    const songs = readLearning();

    const newSong = {
      id: Date.now(),
      title,
      artist,

      coverImage: req.files?.coverImage?.[0]
        ? `api.artjourney.ro/covers/${req.files.coverImage[0].filename}`
        : null,

      lessonVideoUrl: "",
      backingTrackUrl: "",
      tabPdf: null,

      pedals: [],
    };

    songs.unshift(newSong);

    saveLearning(songs);

    res.json({
      success: true,
      song: newSong,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

/* -------------------- */
/* UPDATE DETAILS */
/* -------------------- */

exports.updateLearningSong = (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      lessonVideoUrl,
      backingTrackUrl,
      pedals,
    } = req.body;

    const songs = readLearning();

    const updated = songs.map((song) => {
      if (song.id !== id) return song;

      return {
        ...song,
        lessonVideoUrl,
        backingTrackUrl,
        pedals,
      };
    });

    saveLearning(updated);

    res.json({ success: true});
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

/* -------------------- */
/* UPLOAD PDF */
/* -------------------- */

exports.uploadPdf = (req, res) => {
  try {
    const id = Number(req.params.id);

    const songs = readLearning();

    const uploadedFile = req.files?.tabPdf?.[0];

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
      });
    }

    const pdfUrl =
      `api.artjourney.ro/pdfs/${uploadedFile.filename}`;

    const updated = songs.map((song) => {
      if (song.id !== id) return song;

      return {
        ...song,
        tabPdf: pdfUrl,
      };
    });

    saveLearning(updated);

    res.json({
      success: true,
      tabPdf: pdfUrl,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

/* -------------------- */
/* DELETE SONG */
/* -------------------- */

exports.deleteLearningSong = (req, res) => {
  try {
    const id = Number(req.params.id);

    const songs = readLearning();

    const filtered = songs.filter(
      (song) => song.id !== id
    );

    saveLearning(filtered);

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};
function normalizeYoutubeUrl(url) {
  if (url.includes("music.youtube.com")) {
    const parsed = new URL(url);
    const videoId = parsed.searchParams.get("v");

    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  return url;
}

function cleanYoutubeTitle(title) {
  let cleaned = title;

  cleaned = cleaned.replace(
    /\(.*?(official|video|lyrics|audio|hd|4k|remastered).*?\)/gi,
    ""
  );

  cleaned = cleaned.replace(
    /\[.*?(official|video|lyrics|audio|hd|4k|remastered).*?\]/gi,
    ""
  );

  cleaned = cleaned.replace(/official music video/gi, "");
  cleaned = cleaned.replace(/official video/gi, "");
  cleaned = cleaned.replace(/lyrics video/gi, "");
  cleaned = cleaned.replace(/lyrics/gi, "");
  cleaned = cleaned.replace(/audio/gi, "");
  cleaned = cleaned.replace(/remastered/gi, "");

  // Scoatem artistul din title dacă formatul e Artist - Song
  if (cleaned.includes(" - ")) {
    cleaned = cleaned.split(" - ").slice(1).join(" - ");
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function cleanArtist(author) {
  return author
    .replace(/VEVO/gi, "")
    .replace(/Official/gi, "")
    .trim();
}

function isBadArtist(name) {
  const blacklist = [
    "RHINO",
    "WARNER",
    "RECORDS",
    "TOPIC",
    "UMG",
    "SME",
    "SONY",
    "ATLANTIC",
  ];

  const upper = name.toUpperCase();

  return blacklist.some((word) =>
    upper.includes(word)
  );
}

function extractArtistFromTitle(title) {
  if (!title.includes(" - ")) return null;

  return title.split(" - ")[0].trim();
}

exports.addSongFromYoutube = async (req, res) => {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing youtube url",
      });
    }

    const normalizedUrl =
      normalizeYoutubeUrl(youtubeUrl);

    const response = await axios.get(
      "https://www.youtube.com/oembed",
      {
        params: {
          url: normalizedUrl,
          format: "json",
        },
      }
    );

    const data = response.data;

    const songs = readLearning();

    const cleanedTitle =
      cleanYoutubeTitle(data.title);

    let cleanedArtist = cleanArtist(
      data.author_name
    );

    if (isBadArtist(cleanedArtist)) {
      const fallbackArtist =
        extractArtistFromTitle(data.title);

      if (fallbackArtist) {
        cleanedArtist = fallbackArtist;
      }
    }

    const newSong = {
      id: Date.now(),

      title: cleanedTitle,
      artist: cleanedArtist,

      youtubeUrl: normalizedUrl,
      coverImage: data.thumbnail_url,

      lessonVideoUrl: "",
      backingTrackUrl: "",
      tabPdf: null,
      pedals: [],
    };

    songs.unshift(newSong);

    saveLearning(songs);

    res.json({
      success: true,
      song: newSong,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};