const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, age, dob, contact } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      age,
      dob,
      contact,
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Store token in Redis with 1-hour expiration
    const redisClient = req.app.get("redisClient");
    await redisClient.setEx(`session:${token}`, 3600, user._id.toString());

    res.status(201).json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Store token in Redis with 1-hour expiration
    const redisClient = req.app.get("redisClient");
    await redisClient.setEx(`session:${token}`, 3600, user._id.toString());

    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get profile
router.get("/profile/:userId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update profile
router.put("/profile/:userId", authMiddleware, async (req, res) => {
  try {
    const { name, email, age, dob, contact } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name;
    user.email = email;
    user.age = age !== undefined ? age : user.age;
    user.dob = dob || user.dob;
    user.contact = contact || user.contact;

    await user.save();

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Logout
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (token) {
      const redisClient = req.app.get("redisClient");
      await redisClient.del(`session:${token}`); // Remove token from Redis
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
