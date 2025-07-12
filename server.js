const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const redis = require("redis");
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


const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    tls: true
  }
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));


app.get("/", (req, res) => {
  console.log("Root endpoint accessed");
  return res.json({
    message: "Hii",
    success: true,
  });
});


app.use((req, res, next) => {
  req.app.set("redisClient", redisClient);
  next();
});
app.use("/api", userRoutes);


const startServer = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

startServer();


process.on("SIGINT", async () => {
  await redisClient.quit();
  await mongoose.connection.close();
  console.log("Server shut down gracefully");
  process.exit(0);
});
