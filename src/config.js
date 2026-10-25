require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  dbFile: process.env.DB_FILE || "data.db"
};
