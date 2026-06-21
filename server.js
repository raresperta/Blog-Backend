const express = require("express");

const cors = require("cors");

const path = require("path");

const songsRoutes =
  require("./routes/songsRoutes");

const sessionsRoutes =
  require("./routes/sessionsRoutes");

const creationsRoutes =
  require("./routes/creationsRoutes");

const app = express();

app.use(cors());

app.use(express.json());

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
  "/songs",
  songsRoutes
);

app.use(
  "/sessions",
  sessionsRoutes
);

app.use("/creations", creationsRoutes);

app.listen(
  5001,
  () => {

    console.log(
      "Server running on port 5001"
    );

  }
);