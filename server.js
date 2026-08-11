const express = require("express");

const cors = require("cors");

const path = require("path");

const songsRoutes =
  require("./routes/songsRoutes");

const sessionsRoutes =
  require("./routes/sessionsRoutes");

const creationsRoutes =
  require("./routes/creationsRoutes");

const learningRoutes =
  require("./routes/learningRoutes");

const artworksRoutes =
  require("./routes/artworksRoutes");

const app = express();

app.use(cors());

app.use(express.json({ limit: "15mb" }));

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

app.use(
  "/covers",
  express.static(
    path.join(__dirname, "uploads/covers")
  )
);

app.use(
  "/audio",
  express.static(
    path.join(__dirname, "uploads/audio")
  )
);

app.use(
  "/pdfs",
  express.static(
    path.join(__dirname, "uploads/pdfs")
  )
);

app.use(
  "/pdf-previews",
  express.static(
    path.join(__dirname, "uploads/pdf-previews")
  )
);

app.use(
  "/artworks",
  express.static(
    path.join(__dirname, "uploads/artworks")
  )
);

app.use(
  "/songs",
  songsRoutes
);

app.use(
  "/sessions",
  sessionsRoutes
);

app.use("/creations", creationsRoutes);

app.use("/learning", learningRoutes);

app.use("/art", artworksRoutes);

app.use((error, req, res, next) => {
  console.error("Upload error", {
    method: req.method,
    path: req.originalUrl,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    aborted: req.aborted,
    message: error.message,
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(400).json({
    success: false,
    message: "Uploadul imaginii nu a putut fi procesat. Încearcă din nou.",
  });
});

app.listen(
  5001,
  () => {

    console.log(
      "Server running on port 5001"
    );

  }
);
