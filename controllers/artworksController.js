const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const artworksPath = path.join(__dirname, "../data/artworks.json");

function readArtworks() {
  return JSON.parse(fs.readFileSync(artworksPath, "utf8"));
}

function writeArtworks(artworks) {
  fs.writeFileSync(artworksPath, JSON.stringify(artworks, null, 2));
}

const imageExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function saveArtworkImage(imageData) {
  const match = imageData.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const [, mimeType, encodedImage] = match;
  const buffer = Buffer.from(encodedImage, "base64");
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) return null;

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${imageExtensions[mimeType]}`;
  const uploadPath = path.join(__dirname, "../uploads/artworks", filename);
  fs.writeFileSync(uploadPath, buffer);
  return `/artworks/${filename}`;
}

function normaliseBoardItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 24).map((item, index) => {
    const type = ["reference", "note", "palette"].includes(item.type) ? item.type : "note";
    const position = (value, fallback) => Number.isFinite(Number(value)) ? Math.min(88, Math.max(0, Number(value))) : fallback;
    return {
      id: String(item.id || `${type}-${index}`).slice(0, 80),
      type,
      x: position(item.x, 8 + index * 4),
      y: position(item.y, 8 + index * 3),
      rotation: Number.isFinite(Number(item.rotation)) ? Math.min(8, Math.max(-8, Number(item.rotation))) : 0,
      text: type === "note" ? String(item.text || "").slice(0, 700) : undefined,
      colors: type === "palette" && Array.isArray(item.colors) ? item.colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5) : undefined,
      imageUrl: type === "reference" && typeof item.imageUrl === "string" && item.imageUrl.startsWith("/artworks/") ? item.imageUrl : undefined,
    };
  });
}

function readJpegOrientation(filePath) {
  const bytes = fs.readFileSync(filePath);
  for (let offset = 2; offset + 10 < bytes.length;) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker === 0xe1 && bytes.toString("ascii", offset + 4, offset + 10) === "Exif\0\0") {
      const tiff = offset + 10;
      const littleEndian = bytes.toString("ascii", tiff, tiff + 2) === "II";
      const read16 = (position) => littleEndian ? bytes.readUInt16LE(position) : bytes.readUInt16BE(position);
      const read32 = (position) => littleEndian ? bytes.readUInt32LE(position) : bytes.readUInt32BE(position);
      const ifd = tiff + read32(tiff + 4);
      const entries = read16(ifd);
      for (let index = 0; index < entries; index += 1) {
        const entry = ifd + 2 + index * 12;
        if (read16(entry) === 0x0112) return read16(entry + 8);
      }
    }
    if (!length) break;
    offset += 2 + length;
  }
  return 1;
}

function cropArtworkImage(artwork, crop) {
  const sourceUrl = artwork.originalImageUrl || artwork.imageUrl;
  const sourcePath = path.join(__dirname, "../uploads/artworks", sourceUrl.replace(/^\/artworks\//, ""));
  if (!fs.existsSync(sourcePath)) throw new Error("Imaginea originală nu mai există.");

  const info = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", sourcePath], { encoding: "utf8" });
  const width = Number(info.match(/pixelWidth: (\d+)/)?.[1]);
  const height = Number(info.match(/pixelHeight: (\d+)/)?.[1]);
  if (!width || !height) throw new Error("Nu am putut citi dimensiunile imaginii.");
  const orientation = path.extname(sourcePath).toLowerCase() === ".jpg" || path.extname(sourcePath).toLowerCase() === ".jpeg" ? readJpegOrientation(sourcePath) : 1;
  let cropWidth = Math.max(1, Math.round(width * (crop.cropWidth / 100)));
  let cropHeight = Math.max(1, Math.round(height * (crop.cropHeight / 100)));
  let offsetX = Math.round(width * (crop.cropLeft / 100));
  let offsetY = Math.round(height * (crop.cropTop / 100));
  if (orientation === 6) {
    cropWidth = Math.max(1, Math.round(width * (crop.cropHeight / 100)));
    cropHeight = Math.max(1, Math.round(height * (crop.cropWidth / 100)));
    offsetX = Math.round(width * (crop.cropTop / 100));
    offsetY = Math.round(height * (1 - ((crop.cropLeft + crop.cropWidth) / 100)));
  } else if (orientation === 8) {
    cropWidth = Math.max(1, Math.round(width * (crop.cropHeight / 100)));
    cropHeight = Math.max(1, Math.round(height * (crop.cropWidth / 100)));
    offsetX = Math.round(width * (1 - ((crop.cropTop + crop.cropHeight) / 100)));
    offsetY = Math.round(height * (crop.cropLeft / 100));
  } else if (orientation === 3) {
    offsetX = Math.round(width * (1 - ((crop.cropLeft + crop.cropWidth) / 100)));
    offsetY = Math.round(height * (1 - ((crop.cropTop + crop.cropHeight) / 100)));
  }
  offsetX = Math.min(width - cropWidth, Math.max(0, offsetX));
  offsetY = Math.min(height - cropHeight, Math.max(0, offsetY));
  const extension = path.extname(sourcePath) || ".jpg";
  const outputName = `${Date.now()}-crop-${Math.round(Math.random() * 1e6)}${extension}`;
  const outputPath = path.join(__dirname, "../uploads/artworks", outputName);
  execFileSync("/usr/bin/sips", ["-c", String(cropHeight), String(cropWidth), "--cropOffset", String(offsetY), String(offsetX), "-o", outputPath, sourcePath], { encoding: "utf8" });
  return `/artworks/${outputName}`;
}

exports.getArtworks = (req, res) => {
  try {
    const artworks = readArtworks();
    const category = req.query.category;
    res.json(category ? artworks.filter((item) => item.category === category) : artworks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.addArtwork = (req, res) => {
  try {
    if (!req.body.category || !req.body.imageData) {
      return res.status(400).json({ success: false, message: "Categoria și imaginea sunt obligatorii." });
    }

    const imageUrl = saveArtworkImage(req.body.imageData);
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Imaginea trebuie să fie JPG, PNG, WEBP sau GIF și să aibă maximum 10 MB." });
    }

    const parsedTakenAt = req.body.takenAt ? new Date(req.body.takenAt) : null;
    const takenAt = parsedTakenAt && !Number.isNaN(parsedTakenAt.getTime()) ? parsedTakenAt.toISOString() : new Date().toISOString();
    const displayDate = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(takenAt));
    const artwork = {
      id: Date.now(),
      title: req.body.title?.trim() || `Fotografie din ${displayDate}`,
      category: req.body.category,
      imageUrl,
      originalImageUrl: imageUrl,
      takenAt,
      createdAt: new Date().toISOString(),
    };

    if (req.body.category === "Idei & inspirație") {
      artwork.details = typeof req.body.details === "string" ? req.body.details.trim().slice(0, 1200) : "";
      artwork.medium = typeof req.body.medium === "string" ? req.body.medium.trim().slice(0, 80) : "";
      artwork.palette = Array.isArray(req.body.palette)
        ? req.body.palette.filter((color) => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5)
        : [];
      artwork.boardItems = [];
    }

    const artworks = readArtworks();
    artworks.unshift(artwork);
    writeArtworks(artworks);
    res.status(201).json({ success: true, artwork });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.updateArtwork = (req, res) => {
  try {
    const artworks = readArtworks();
    const index = artworks.findIndex((artwork) => String(artwork.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: "Proiectul nu a fost găsit." });

    const artwork = artworks[index];
    const hasFilters = req.body.filters && typeof req.body.filters === "object";
    if (artwork.category !== "Idei & inspirație" && !hasFilters) {
      return res.status(400).json({ success: false, message: "Doar filtrele pot fi editate pentru această lucrare." });
    }

    if (artwork.category === "Idei & inspirație") {
      const title = typeof req.body.title === "string" ? req.body.title.trim().slice(0, 140) : "";
      artwork.title = title || artwork.title;
      if (typeof req.body.details === "string") artwork.details = req.body.details.trim().slice(0, 1200);
      if (typeof req.body.medium === "string") artwork.medium = req.body.medium.trim().slice(0, 80);
      if (Array.isArray(req.body.palette)) artwork.palette = req.body.palette.filter((color) => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5);
    }
    if (hasFilters) {
      const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
      artwork.filters = {
        brightness: clamp(req.body.filters.brightness, 0, 160, 100),
        contrast: clamp(req.body.filters.contrast, 0, 160, 100),
        saturate: clamp(req.body.filters.saturate, 0, 160, 100),
        grayscale: clamp(req.body.filters.grayscale, 0, 100, 0),
        zoom: clamp(req.body.filters.zoom, 100, 200, 100),
        cropX: clamp(req.body.filters.cropX, 0, 100, 50),
        cropY: clamp(req.body.filters.cropY, 0, 100, 50),
        cropLeft: clamp(req.body.filters.cropLeft, 0, 75, 0),
        cropTop: clamp(req.body.filters.cropTop, 0, 75, 0),
        cropWidth: clamp(req.body.filters.cropWidth, 20, 100, 100),
        cropHeight: clamp(req.body.filters.cropHeight, 20, 100, 100),
      };
      const crop = artwork.filters;
      if (crop.cropLeft > 0 || crop.cropTop > 0 || crop.cropWidth < 100 || crop.cropHeight < 100) {
        if (!artwork.originalImageUrl) artwork.originalImageUrl = artwork.imageUrl;
        artwork.imageUrl = cropArtworkImage(artwork, crop);
        artwork.filters = { ...crop, cropLeft: 0, cropTop: 0, cropWidth: 100, cropHeight: 100 };
      }
    }
    if (req.body.imageData) {
      const imageUrl = saveArtworkImage(req.body.imageData);
      if (!imageUrl) return res.status(400).json({ success: false, message: "Imaginea nouă trebuie să fie JPG, PNG, WEBP sau GIF și să aibă maximum 10 MB." });
      artwork.imageUrl = imageUrl;
      artwork.originalImageUrl = imageUrl;
    }
    if (Array.isArray(req.body.boardItems)) artwork.boardItems = normaliseBoardItems(req.body.boardItems);
    if (req.body.referenceImageData) {
      const referenceUrl = saveArtworkImage(req.body.referenceImageData);
      if (!referenceUrl) return res.status(400).json({ success: false, message: "Referința trebuie să fie JPG, PNG, WEBP sau GIF și să aibă maximum 10 MB." });
      const boardItems = Array.isArray(artwork.boardItems) ? artwork.boardItems : [];
      boardItems.push({ id: `reference-${Date.now()}`, type: "reference", imageUrl: referenceUrl, x: 52, y: 18, rotation: 2 });
      artwork.boardItems = boardItems;
    }
    artwork.updatedAt = new Date().toISOString();
    artworks[index] = artwork;
    writeArtworks(artworks);
    res.json({ success: true, artwork });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
