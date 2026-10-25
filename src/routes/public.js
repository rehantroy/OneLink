const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/api/u/:username", (req, res) => {
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(String(req.params.username).toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "Page not found" });
  }

  const links = db
    .prepare("SELECT id, title FROM links WHERE user_id = ? AND is_active = 1 ORDER BY position, id")
    .all(user.id);

  res.json({
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    theme: user.theme,
    links
  });
});

// counts the click, then sends the visitor to the real link
// (clicks from the dashboard preview have ?preview=1 and are not counted)
router.get("/go/:id", (req, res) => {
  const link = db
    .prepare("SELECT * FROM links WHERE id = ? AND is_active = 1")
    .get(Number(req.params.id));

  if (!link) {
    return res.status(404).send("This link is not available");
  }

  if (!req.query.preview) {
    db.prepare("UPDATE links SET clicks = clicks + 1 WHERE id = ?").run(link.id);
  }
  res.redirect(302, link.url);
});

module.exports = router;
