const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");
const { checkUsername, THEMES } = require("../validators");
const { publicUser } = require("./auth");

const router = express.Router();

router.put("/", requireAuth, (req, res) => {
  const user = req.user;
  const { name, bio, theme } = req.body;

  let username = user.username;
  if (req.body.username !== undefined) {
    const check = checkUsername(req.body.username);
    if (check.error) return res.status(400).json({ error: check.error });

    const taken = db
      .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .get(check.username, user.id);
    if (taken) return res.status(409).json({ error: "This username is already taken" });

    username = check.username;
  }

  const newName = name !== undefined ? String(name).trim() : user.name;
  if (!newName || newName.length > 50) {
    return res.status(400).json({ error: "Name is required (max 50 characters)" });
  }

  const newBio = bio !== undefined ? String(bio).trim() : user.bio;
  if (newBio.length > 160) {
    return res.status(400).json({ error: "Bio can be max 160 characters" });
  }

  const newTheme = theme !== undefined ? theme : user.theme;
  if (!THEMES.includes(newTheme)) {
    return res.status(400).json({ error: "Unknown theme" });
  }

  db.prepare("UPDATE users SET username = ?, name = ?, bio = ?, theme = ? WHERE id = ?")
    .run(username, newName, newBio, newTheme, user.id);

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  res.json({ user: publicUser(updated) });
});

module.exports = router;
