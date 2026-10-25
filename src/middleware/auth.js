const jwt = require("jsonwebtoken");
const config = require("../config");
const db = require("../db");

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Please log in first" });
  }

  try {
    const { userId } = jwt.verify(token, config.jwtSecret);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      return res.status(401).json({ error: "Account not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired, log in again" });
  }
}

module.exports = requireAuth;
