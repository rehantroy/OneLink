const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { router: authRoutes } = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const linkRoutes = require("./routes/links");
const publicRoutes = require("./routes/public");

const app = express();
const publicDir = path.join(__dirname, "..", "public");

app.use(express.json());
app.use(cookieParser());
app.use(express.static(publicDir));

app.get("/api/config", (req, res) => {
  res.json({ googleClientId: config.googleClientId });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/links", linkRoutes);
app.use(publicRoutes);

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/:username", (req, res, next) => {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(req.params.username)) return next();
  res.sendFile(path.join(publicDir, "page.html"));
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, "404.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  res.status(500).json({ error: "Something went wrong" });
});

module.exports = app;
