const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify token with JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Check if token exists in Redis
    const redisClient = req.app.get("redisClient");
    const session = await redisClient.get(`session:${token}`);

    if (!session) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
};

module.exports = { authMiddleware };
