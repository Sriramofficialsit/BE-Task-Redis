const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    const redisClient = req.app.get("redisClient");
    const session = await redisClient.get(`session:${token}`);

    if (!session || session !== decoded.userId.toString()) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    const sessionVersion = await redisClient.get(`user:${decoded.userId}:sessionVersion`);
    if (sessionVersion && sessionVersion !== decoded.sessionVersion) {
      await redisClient.del(`session:${token}`);
      return res.status(401).json({ message: "Session invalidated, please log in again" });
    }

    req.sessionVersion = sessionVersion || "0";
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
};

module.exports = { authMiddleware };
