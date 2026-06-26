const fs = require("fs");
const path = require("path");
exports.getSongs = (req, res) => {
  try {
    const songsPath = path.join(
      __dirname,
      "../data/creations.json"
    );

    const songs = JSON.parse(
      fs.readFileSync(songsPath, "utf8")
    );

    res.json(songs);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};
exports.addSong = (req, res) => {
  try {
    const {
      type,
      title,
      bpm,
      key,
      status,
      description,
    } = req.body;

    const songsPath = path.join(
      __dirname,
      "../data/creations.json"
    );

    const songs = JSON.parse(
      fs.readFileSync(songsPath, "utf8")
    );

    const newSong = {
      id: Date.now(),
      type,
      title,
      bpm,
      key,
      status,
      description,

      coverImage: req.files?.coverImage?.[0]
        ? `api.artjourney.ro/covers/${req.files.coverImage[0].filename}`
        : null,

      audioFile: req.files?.audioFile?.[0]
        ? `api.artjourney.ro/audio/${req.files.audioFile[0].filename}`
        : null,
    };

    songs.unshift(newSong);

    fs.writeFileSync(
      songsPath,
      JSON.stringify(songs, null, 2)
    );

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

exports.deleteCreation = (req, res) => {
  const id = Number(req.params.id);

  const creationsPath = path.join(
    __dirname,
    "../data/creations.json"
  );

  const creations = JSON.parse(
    fs.readFileSync(creationsPath, "utf8")
  );

  const filtered = creations.filter(
    (item) => item.id !== id
  );

  fs.writeFileSync(
    creationsPath,
    JSON.stringify(filtered, null, 2)
  );

  res.json({ success: true });
};