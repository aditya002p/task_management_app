const express = require("express");
const connectDB = require("./src/config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import routes
const authRoutes = require("./src/routes/auth");
const taskRoutes = require("./src/routes/tasks");
const postRoutes = require("./src/routes/posts");

// Create Express app
const app = express();

// Connect Database
connectDB();

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

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Custom error handling for async routes
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Define Routes with async error handling
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

const PORT = process.env.PORT || 5000;

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
