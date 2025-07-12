const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const redis = require("redis");
const { authMiddleware } = require("./middleware/authMiddleware");
const userRoutes = require("./routes/auth");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "https://login-credit-task-app.netlify.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Redis client setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

// Routes
app.use("/api", userRoutes);
app.get("/", (req, res) => {
  app.get("/", (req, res) => {
    console.log("Root endpoint accessed");
    return res.json({
      message: "Hii",
      success: true,
    });
  });
  return res.json({
    message: "Hii",
    success: true,
  });
});

const startServer = async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log("Redis connected");

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/rentalapp"
    );
    console.log("MongoDB connected");

    // Set Redis client on app
    app.set("redisClient", redisClient);

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  await redisClient.quit();
  await mongoose.connection.close();
  console.log("Server shut down gracefully");
  process.exit(0);
});
