

const fs = require("fs");

const path = require("path");

const ffmpeg =
  require("fluent-ffmpeg");

const PUBLIC_API_URL = "https://api.artjourney.ro";

function normalizeMediaUrl(mediaUrl) {
  if (!mediaUrl) return mediaUrl;

  try {
    const url = new URL(mediaUrl);

    if (["/videos/", "/thumbnails/"].some((prefix) => url.pathname.startsWith(prefix))) {
      return `${PUBLIC_API_URL}${url.pathname}`;
    }
  } catch {
    if (mediaUrl.startsWith("/")) {
      return `${PUBLIC_API_URL}${mediaUrl}`;
    }
  }

  return mediaUrl;
}

/* -------------------- */




/* -------------------- */
/* STORAGE */
/* -------------------- */


/* -------------------- */
/* GET SESSIONS */
/* -------------------- */

exports.getSessions = (req, res) => {

  try {

    const sessionsPath =

      path.join(

        __dirname,

        "../data/sessions.json"

      );

    const data =

      JSON.parse(

        fs.readFileSync(

          sessionsPath,

          "utf8"

        )

      );

    res.json(data.map((session) => ({
      ...session,
      thumbnail: normalizeMediaUrl(session.thumbnail),
      videoUrl: normalizeMediaUrl(session.videoUrl),
    })));

  } catch (err) {

    console.log(err);

    res.status(500).json({

      success: false,

    });

  }

};

/* -------------------- */
/* UPLOAD */
/* -------------------- */

exports.uploadVideo = async (req, res) => {

    try {

      const {
        title,
        description,
        song,
        date,
        isBestTake
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

      let recordedAt = null;

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

          recordedAt = new Date(possibleDate).toISOString();

          detectedDate =

            recordedAt

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

          "../uploads/thumbnails"

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

        recordedAt,

        isBestTake: isBestTake === "true",

        orientation,

        thumbnail:

          `https://api.artjourney.ro/thumbnails/${thumbnailName}`,

        videoUrl:

          `https://api.artjourney.ro/videos/${req.file.filename}`,

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
          "../data/sessions.json"
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

      /* -------------------- */
      /* MASTER SONG */
      /* -------------------- */

      if (isBestTake === "true") {

        const songsPath = path.join(
          __dirname,
          "../data/songs.json"
        );

        const songs = JSON.parse(
          fs.readFileSync(
            songsPath,
            "utf8"
          )
        );

        const updatedSongs = songs.map(
          (currentSong) => {

            if (
              currentSong.title
                .toLowerCase() ===
              song.toLowerCase()
            ) {

              return {

                ...currentSong,

                isMastered: true,

              };

            }

            return currentSong;

          }
        );

        fs.writeFileSync(

          songsPath,

          JSON.stringify(
            updatedSongs,
            null,
            2
          )

        );

        console.log(
          "Song marked as mastered"
        );

      }

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

  };

/* -------------------- */
/* CHECK VIDEO DATE */
/* -------------------- */

exports.checkVideoDate = async (req, res) => {

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

      let recordedAt = null;

      if (possibleDate) {

        hasDetectedDate =
          true;

        try {

          recordedAt = new Date(possibleDate).toISOString();

          detectedDate =

            recordedAt

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

        recordedAt,

      });

    } catch (err) {

      console.log(err);

      res.status(500).json({

        success: false,

      });

    }

  };


/* -------------------- */
/* EDIT VIDEO */
/* -------------------- */

exports.editVideo = async (req, res) => {

  try {

    console.time("editVideo");

    const { id } = req.params;

    const numericId = Number(id);

    const {

      description,

      isBestTake,

      trimStart,

      trimEnd,

    } = req.body;

    const sessionsPath = path.join(

      __dirname,

      "../data/sessions.json"

    );

    const songsPath = path.join(

      __dirname,

      "../data/songs.json"

    );

    const sessions = JSON.parse(

      fs.readFileSync(sessionsPath, "utf8")

    );

    const sessionIndex = sessions.findIndex(

      (s) => s.id === numericId

    );

    if (sessionIndex === -1) {

      return res.status(404).json({

        success: false,

        message: "Session not found",

      });

    }

    let session = sessions[sessionIndex];

    /* -------------------- */

    /* FAST TRIM (OPTIONAL) */

    /* -------------------- */

    const shouldTrim =

      trimStart != null &&

      trimEnd != null &&

      Number(trimEnd) > Number(trimStart) &&

      !(Number(trimStart) === 0 && trimEnd == null);

    if (shouldTrim) {

      const fileName = session.videoUrl.split("/").pop();

      const inputPath = path.join(

        __dirname,

        "../uploads/videos",

        fileName

      );

      const tempPath = path.join(

        __dirname,

        "../uploads/videos",

        `temp-${Date.now()}.mp4`

      );

      console.time("ffmpeg");

      await new Promise((resolve, reject) => {

        ffmpeg()

          .input(inputPath)

          .inputOptions([

            `-ss ${Number(trimStart)}`

          ])

          .outputOptions([

            `-t ${Number(trimEnd) - Number(trimStart)}`,

            "-map 0",

            "-c copy"

          ])

          .save(tempPath)

          .on("end", resolve)

          .on("error", reject);

      });

      console.timeEnd("ffmpeg");

      fs.unlinkSync(inputPath);

      fs.renameSync(tempPath, inputPath);

      /* după ce ai tăiat fizic, resetăm trim */

      session.trimStart = 0;

      session.trimEnd = null;

    }

    /* -------------------- */

    /* UPDATE SESSION */

    /* -------------------- */

    const editedSession = {

      ...session,

      description:

        description ?? session.description,

      isBestTake:

        isBestTake ?? session.isBestTake,

      trimStart:

        shouldTrim

          ? 0

          : (trimStart ?? session.trimStart),

      trimEnd:

        shouldTrim

          ? null

          : (trimEnd ?? session.trimEnd),

    };

    sessions[sessionIndex] = editedSession;

    fs.writeFileSync(

      sessionsPath,

      JSON.stringify(sessions, null, 2)

    );

    /* -------------------- */

    /* UPDATE SONGS */

    /* -------------------- */

    const songs = JSON.parse(

      fs.readFileSync(songsPath, "utf8")

    );

    const updatedSongs = songs.map((song) => {

      if (

        song.title.toLowerCase() ===

        editedSession.song.toLowerCase()

      ) {

        return {

          ...song,

          isMastered:

            editedSession.isBestTake,

        };

      }

      return song;

    });

    fs.writeFileSync(

      songsPath,

      JSON.stringify(updatedSongs, null, 2)

    );

    console.timeEnd("editVideo");

    return res.json({

      success: true,

      session: editedSession,

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      message: err.message,

    });

  }

};

/* -------------------- */
/* DELETE VIDEO */
/* -------------------- */

exports.deleteVideo = (req, res) => {

  try {

    const { id } = req.params;

    const sessionsPath = path.join(
      __dirname,
      "../data/sessions.json"
    );

    const sessions = JSON.parse(
      fs.readFileSync(
        sessionsPath,
        "utf8"
      )
    );

    const filtered =
      sessions.filter(
        (session) =>
          session.id !== Number(id)
      );

    fs.writeFileSync(

      sessionsPath,

      JSON.stringify(
        filtered,
        null,
        2
      )
    );

    res.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
    });
  }
};

/* -------------------- */
/* START */
/* -------------------- */
