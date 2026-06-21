const fs = require("fs");

const path = require("path");

exports.getSongs = (
  req,
  res
) => {

  try {

    const songsPath =
      path.join(
        __dirname,
        "../data/songs.json"
      );

    const songs =
      JSON.parse(

        fs.readFileSync(
          songsPath,
          "utf8"
        )

      );

    res.json(songs);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false
    });

  }

};

exports.addSong = (
  req,
  res
) => {

  try {

    const {
      title,
      isMastered
    } = req.body;

    const songsPath =
      path.join(
        __dirname,
        "../data/songs.json"
      );

    const songs =
      JSON.parse(

        fs.readFileSync(
          songsPath,
          "utf8"
        )

      );

    const existingSong =
      songs.find(

        song =>

          song.title
            .toLowerCase() ===
          title
            .toLowerCase()

      );

    if (existingSong) {

      return res.json({

        success: true,

        song:
          existingSong

      });

    }

    const newSong = {

      id: Date.now(),

      title,

      isMastered:
        isMastered || false

    };

    songs.push(newSong);

    fs.writeFileSync(

      songsPath,

      JSON.stringify(
        songs,
        null,
        2
      )

    );

    res.json({

      success: true,

      song: newSong

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false
    });

  }

};