const express = require("express");
const connectDB = require("./src/config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Connect to database only if not already connected
let isConnected = false;
const initDB = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      msg: Object.values(err.errors).map((val) => val.message),
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      msg: "Duplicate field value entered",
    });
  }

  // JWT Error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      msg: "Invalid token",
    });
  }

  // JWT Expired
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      msg: "Token expired",
    });
  }

  res.status(500).json({
    msg: "Server Error",
  });
};

// Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/tasks", require("./src/routes/tasks"));
app.use("/api/posts", require("./src/routes/posts"));

// Global Error Handling Middleware
app.use(errorHandler);

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// Vercel serverless function export
module.exports = async (req, res) => {
  await initDB();
  return app(req, res);
};
