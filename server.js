const express = require("express");

const cors = require("cors");

const multer = require("multer");

const fs = require("fs");

const path = require("path");

const ffmpeg =
  require("fluent-ffmpeg");

/* -------------------- */

const app = express();

app.use(cors());

app.use(express.json());

/* -------------------- */
/* STATIC */
/* -------------------- */

app.use(

  "/videos",

  express.static(

    path.join(
      __dirname,
      "uploads/videos"
    )

  )

);

app.use(

  "/thumbnails",

  express.static(

    path.join(
      __dirname,
      "uploads/thumbnails"
    )

  )

);

/* -------------------- */
/* STORAGE */
/* -------------------- */

const storage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {

        cb(

          null,

          path.join(
            __dirname,
            "uploads/videos"
          )

        );

      },

    filename:
      function (
        req,
        file,
        cb
      ) {

        const uniqueName =

          Date.now() +
          "-" +
          file.originalname;

        cb(
          null,
          uniqueName
        );

      },

  });

const upload =
  multer({ storage });

/* -------------------- */
/* GET SESSIONS */
/* -------------------- */

app.get(

  "/sessions",

  (req, res) => {

    try {

      const sessionsPath =
        path.join(
          __dirname,
          "data/sessions.json"
        );

      const data =
        JSON.parse(

          fs.readFileSync(
            sessionsPath,
            "utf8"
          )

        );

      res.json(data);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
      });

    }

  }

);

/* -------------------- */
/* UPLOAD */
/* -------------------- */

app.post(

  "/upload-video",

  upload.single("video"),

  async (req, res) => {

    try {

      const {
        title,
        description,
        song,
        date,
      } = req.body;

      console.log("\n");
      console.log(
        "=================================="
      );

      console.log("NEW VIDEO");

      console.log(
        "=================================="
      );

      console.log(
        "Original file:",
        req.file.originalname
      );

      console.log(
        "Saved path:",
        req.file.path
      );

      /* -------------------- */
      /* DEFAULT DATE */
      /* -------------------- */

      let detectedDate =

        date ||

        new Date()
          .toISOString()
          .split("T")[0];

      let hasDetectedDate =
        false;

      /* -------------------- */
      /* METADATA */
      /* -------------------- */

      const metadata =
        await new Promise(

          (resolve, reject) => {

            ffmpeg.ffprobe(

              req.file.path,

              (err, data) => {

                if (err) {

                  console.log(
                    "\nFFPROBE ERROR:"
                  );

                  console.log(err);

                  reject(err);

                } else {

                  resolve(data);

                }

              }

            );

          }

        );

      console.log("\n");

      console.log(
        "========== FULL METADATA =========="
      );

      console.log(

        JSON.stringify(
          metadata,
          null,
          2
        )

      );

      /* -------------------- */
      /* VIDEO STREAM */
      /* -------------------- */

      const videoStream =

        metadata?.streams?.find(

          (s) =>
            s.width &&
            s.height

        );

      console.log("\n");

      console.log(
        "========== VIDEO STREAM =========="
      );

      console.log(videoStream);

      /* -------------------- */
      /* FORMAT */
      /* -------------------- */

      console.log("\n");

      console.log(
        "========== FORMAT =========="
      );

      console.log(
        metadata?.format
      );

      /* -------------------- */
      /* TRY TO DETECT DATE */
      /* -------------------- */

      const possibleDate =

        metadata?.format?.tags
          ?.creation_time ||

        metadata?.streams?.[0]
          ?.tags
          ?.creation_time ||

        metadata?.format?.tags
          ?.date ||

        metadata?.format?.tags
          ?.com
          ?.apple
          ?.quicktime
          ?.creationdate ||

        metadata?.format?.tags
          ?.["com.apple.quicktime.creationdate"];

      console.log("\n");

      console.log(
        "========== POSSIBLE DATE =========="
      );

      console.log(
        possibleDate
      );

      /* -------------------- */
      /* USE METADATA DATE */
      /* -------------------- */

      if (possibleDate) {

        hasDetectedDate =
          true;

        try {

          detectedDate =

            new Date(
              possibleDate
            )

              .toISOString()

              .split("T")[0];

        } catch (err) {

          console.log(
            "Date parse failed"
          );

        }

      }

      console.log("\n");

      console.log(
        "========== FINAL DATE =========="
      );

      console.log(
        detectedDate
      );

      console.log("\n");

      console.log(
        "========== HAS DETECTED DATE =========="
      );

      console.log(
        hasDetectedDate
      );

      /* -------------------- */
      /* ORIENTATION */
      /* -------------------- */

      const orientation =

        videoStream &&
        videoStream.height >
          videoStream.width

          ? "portrait"

          : "landscape";

      console.log("\n");

      console.log(
        "========== ORIENTATION =========="
      );

      console.log(
        orientation
      );

      /* -------------------- */
      /* THUMBNAIL */
      /* -------------------- */

      const thumbnailName =

        `${Date.now()}.png`;

      const thumbnailFolder =
        path.join(

          __dirname,

          "uploads/thumbnails"

        );

      await new Promise(

        (resolve, reject) => {

          const command =
            ffmpeg(req.file.path);

          /* PORTRAIT */

          if (
            orientation ===
            "portrait"
          ) {

            command.screenshots({

              timestamps: ["1"],

              filename:
                thumbnailName,

              folder:
                thumbnailFolder,

              size: "360x?",

            });

          }

          /* LANDSCAPE */

          else {

            command.screenshots({

              timestamps: ["1"],

              filename:
                thumbnailName,

              folder:
                thumbnailFolder,

              size: "640x?",

            });

          }

          command
            .on(
              "end",
              () => {

                console.log(
                  "\nThumbnail generated"
                );

                resolve();

              }
            )

            .on(
              "error",
              (err) => {

                console.log(
                  "\nThumbnail error:"
                );

                console.log(err);

                reject(err);

              }
            );

        }

      );

      /* -------------------- */
      /* SESSION */
      /* -------------------- */

      const newSession = {

        id: Date.now(),

        title,

        description,

        song,

        date:
          detectedDate,

        hasDetectedDate,

        orientation,

        thumbnail:

          `http://localhost:5001/thumbnails/${thumbnailName}`,

        videoUrl:

          `http://localhost:5001/videos/${req.file.filename}`,

      };

      console.log("\n");

      console.log(
        "========== SAVED SESSION =========="
      );

      console.log(
        newSession
      );

      /* -------------------- */
      /* SAVE */
      /* -------------------- */

      const sessionsPath =
        path.join(
          __dirname,
          "data/sessions.json"
        );

      const existingData =
        JSON.parse(

          fs.readFileSync(
            sessionsPath,
            "utf8"
          )

        );

      existingData.push(
        newSession
      );

      fs.writeFileSync(

        sessionsPath,

        JSON.stringify(
          existingData,
          null,
          2
        )

      );

      console.log("\n");

      console.log(
        "Session saved to JSON"
      );

      console.log(
        "=================================="
      );

      /* -------------------- */

      res.json({

        success: true,

        session:
          newSession,

        detectedDate,

        hasDetectedDate,

      });

    } catch (err) {

      console.log("\n");

      console.log(
        "========== SERVER ERROR =========="
      );

      console.log(err);

      res.status(500).json({

        success: false,

      });

    }

  }

);

/* -------------------- */
/* CHECK VIDEO DATE */
/* -------------------- */

app.post(

  "/check-video-date",

  upload.single("video"),

  async (req, res) => {

    try {

      const metadata =
        await new Promise(

          (resolve, reject) => {

            ffmpeg.ffprobe(

              req.file.path,

              (err, data) => {

                if (err) {

                  reject(err);

                } else {

                  resolve(data);

                }

              }

            );

          }

        );

      /* -------------------- */
      /* TRY TO DETECT DATE */
      /* -------------------- */

      const possibleDate =

        metadata?.format?.tags
          ?.creation_time ||

        metadata?.streams?.[0]
          ?.tags
          ?.creation_time ||

        metadata?.format?.tags
          ?.date ||

        metadata?.format?.tags
          ?.com
          ?.apple
          ?.quicktime
          ?.creationdate ||

        metadata?.format?.tags
          ?.["com.apple.quicktime.creationdate"];

      let hasDetectedDate =
        false;

      let detectedDate =
        null;

      if (possibleDate) {

        hasDetectedDate =
          true;

        try {

          detectedDate =

            new Date(
              possibleDate
            )

              .toISOString()

              .split("T")[0];

        } catch (err) {

          console.log(err);

        }

      }

      /* DELETE TEMP FILE */

      fs.unlinkSync(
        req.file.path
      );

      res.json({

        success: true,

        hasDetectedDate,

        detectedDate,

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        success: false,

      });

    }

  }

);

/* -------------------- */
/* GET SONGS */
/* -------------------- */

app.get("/songs", (req, res) => {

  try {

    const songsPath = path.join(
      __dirname,
      "data/songs.json"
    );

    const songs = JSON.parse(
      fs.readFileSync(
        songsPath,
        "utf8"
      )
    );

    res.json(songs);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }

});

/* -------------------- */
/* ADD SONG */
/* -------------------- */

app.post("/songs", (req, res) => {

  try {

    const { title } = req.body;

    const songsPath = path.join(
      __dirname,
      "data/songs.json"
    );

    const songs = JSON.parse(
      fs.readFileSync(
        songsPath,
        "utf8"
      )
    );

    /* already exists */

    const existingSong = songs.find(

      (song) =>

        song.title.toLowerCase() ===
        title.toLowerCase()

    );

    if (existingSong) {

      return res.json({
        success: true,
        song: existingSong,
      });

    }

    /* new song */

    const newSong = {

      id: Date.now(),

      title,

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
      song: newSong,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });

  }

});

/* -------------------- */
/* START */
/* -------------------- */

app.listen(

  5001,

  () => {

    console.log(
      "Server running on port 5001"
    );

  }

);