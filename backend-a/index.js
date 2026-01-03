/**
 * Backend Service A - Image Upload Microservice
 *
 * This service provides a RESTful API for image upload and storage.
 * It receives image uploads from the frontend via APIM gateway,
 * stores them in PostgreSQL, and returns upload status.
 *
 * Environment Variables Required:
 * - PORT: Server port (default: 8080)
 * - DB_HOST: PostgreSQL server hostname
 * - DB_PORT: PostgreSQL port (default: 5432)
 * - DB_USER: PostgreSQL username
 * - DB_PASSWORD: PostgreSQL password
 * - DB_NAME: PostgreSQL database name
 * - DB_SSL: SSL mode ('require' or false)
 *
 * Endpoints:
 * - GET /        : Service info and available endpoints
 * - GET /health  : Health check for Kubernetes liveness/readiness probes
 * - GET /api/a   : API info (returns usage instructions)
 * - POST /api/a  : Image upload endpoint (accepts multipart/form-data)
 */

const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND = "backend-a"; // Service identifier for multi-backend architecture

/**
 * PostgreSQL Connection Pool
 *
 * Maintains a pool of database connections for efficient query execution.
 * SSL is configured based on environment variable to support both
 * development (no SSL) and production (SSL required) scenarios.
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "require" ? { rejectUnauthorized: false } : false,
});

/**
 * File Upload Middleware Configuration
 *
 * Uses multer with memory storage to handle file uploads.
 * Files are stored in memory as Buffer objects and then
 * persisted to PostgreSQL database.
 */
const upload = multer({ storage: multer.memoryStorage() });

/**
 * CORS Middleware
 *
 * Enables Cross-Origin Resource Sharing for frontend access.
 * In production, APIM handles CORS, but this allows direct testing.
 *
 * Allows:
 * - All origins (*)
 * - GET, POST, OPTIONS methods
 * - Content-Type header
 */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Root Endpoint - Service Information
 *
 * GET /
 * Returns basic service information and available endpoints.
 * Useful for service discovery and API documentation.
 */
app.get("/", (req, res) => {
  res.json({
    backend: BACKEND,
    message: "Backend service is running",
    endpoints: {
      health: "/health",
      api: "/api/a (POST for data submission)"
    }
  });
});

/**
 * Health Check Endpoint
 *
 * GET /health
 * Used by Kubernetes liveness and readiness probes to determine
 * if the service is healthy and ready to accept traffic.
 *
 * Returns:
 * - status: Service health status
 * - backend: Service identifier
 * - port: Running port number
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", backend: BACKEND, port: PORT });
});

/**
 * API Information Endpoint
 *
 * GET /api/a
 * Returns API usage instructions for browser-based testing.
 * Helps developers understand how to use the POST endpoint.
 */
app.get("/api/a", (req, res) => {
  res.json({
    backend: BACKEND,
    message: "Use POST to submit data",
    endpoint: "/api/a"
  });
});

/**
 * Image Upload Endpoint
 *
 * POST /api/a
 * Accepts image uploads via multipart/form-data and stores them in PostgreSQL.
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Field name: 'image'
 * - File type: Image files
 *
 * Process:
 * 1. Receives uploaded image via multer middleware
 * 2. Stores image buffer and metadata in PostgreSQL
 * 3. Fetches recent 5 entries for response
 * 4. Returns upload status with recent data
 *
 * Response (Success - 200):
 * {
 *   backend: "backend-a",
 *   rows: [...],            // Recent 5 database entries
 *   uploadedImage: "..."    // Base64 encoded image (if uploaded)
 * }
 *
 * Response (Error - 500):
 * {
 *   error: "Database not responding",
 *   details: "error message"
 * }
 */
app.post("/api/a", upload.single("image"), async (req, res) => {
  try {
    // Extract image buffer from uploaded file
    const image = req.file ? req.file.buffer : null;
    const meta = { uploaded: !!image };

    // Insert upload record into PostgreSQL database
    // Table: requests (backend_name, meta, image)
    await pool.query(
      `INSERT INTO requests (backend_name, meta, image) VALUES ($1, $2, $3)`,
      [BACKEND, JSON.stringify(meta), image]
    );

    // Fetch recent 5 entries to show upload history
    const result = await pool.query(
      `SELECT id, backend_name, ts, meta FROM requests ORDER BY ts DESC LIMIT 5`
    );

    // Return success response with recent data
    res.json({
      backend: BACKEND,
      rows: result.rows,
      uploadedImage: image ? image.toString("base64") : null,
    });
  } catch (err) {
    // Log and return database errors
    console.error("Database error:", err);
    res.status(500).json({
      error: "Database not responding",
      details: err.message,
    });
  }
});

/**
 * Start Express Server
 *
 * Listens on configured PORT (default: 8080)
 * This port is exposed in Dockerfile and mapped in Kubernetes Service
 */
app.listen(PORT, () => {
  console.log(`${BACKEND} listening on port ${PORT}`);
});
