const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND = "backend-a";

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "require" ? { rejectUnauthorized: false } : false,
});

// File upload middleware
const upload = multer({ storage: multer.memoryStorage() });

// CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", backend: BACKEND, port: PORT });
});

// Image upload endpoint
app.post("/api/a", upload.single("image"), async (req, res) => {
  try {
    const image = req.file ? req.file.buffer : null;
    const meta = { uploaded: !!image };

    // Insert into database
    await pool.query(
      `INSERT INTO requests (backend_name, meta, image) VALUES ($1, $2, $3)`,
      [BACKEND, JSON.stringify(meta), image]
    );

    // Fetch recent entries
    const result = await pool.query(
      `SELECT id, backend_name, ts, meta FROM requests ORDER BY ts DESC LIMIT 5`
    );

    res.json({
      backend: BACKEND,
      rows: result.rows,
      uploadedImage: image ? image.toString("base64") : null,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      error: "Database not responding",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`${BACKEND} listening on port ${PORT}`);
});
