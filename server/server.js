const express = require("express");
const connectDB = require("./src/config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Define Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/tasks", require("./src/routes/tasks"));
app.use("/api/posts", require("./src/routes/posts"));

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
