const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");
const { normalizeUrl } = require("../validators");

const router = express.Router();
router.use(requireAuth);

const MAX_LINKS = 50;

function getUserLinks(userId) {
  return db
    .prepare("SELECT * FROM links WHERE user_id = ? ORDER BY position, id")
    .all(userId);
}

function findOwnLink(req, res) {
  const link = db.prepare("SELECT * FROM links WHERE id = ?").get(Number(req.params.id));
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return null;
  }
  if (link.user_id !== req.user.id) {
    res.status(403).json({ error: "You can only change your own links" });
    return null;
  }
  return link;
}

router.get("/", (req, res) => {
  res.json({ links: getUserLinks(req.user.id) });
});

router.post("/", (req, res) => {
  const title = String(req.body.title || "").trim();
  const url = normalizeUrl(req.body.url);

  if (!title || title.length > 60) {
    return res.status(400).json({ error: "Title is required (max 60 characters)" });
  }
  if (!url) {
    return res.status(400).json({ error: "Please enter a valid link, like instagram.com/you" });
  }

  const count = db.prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?").get(req.user.id).n;
  if (count >= MAX_LINKS) {
    return res.status(400).json({ error: `You can add up to ${MAX_LINKS} links` });
  }

  const last = db
    .prepare("SELECT MAX(position) AS pos FROM links WHERE user_id = ?")
    .get(req.user.id);
  const position = (last.pos ?? -1) + 1;

  const result = db
    .prepare("INSERT INTO links (user_id, title, url, position) VALUES (?, ?, ?, ?)")
    .run(req.user.id, title, url, position);

  const link = db.prepare("SELECT * FROM links WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ link });
});

// must stay above "/:id", otherwise "reorder" is treated as an id
router.put("/reorder", (req, res) => {
  const ids = req.body.ids;
  const own = getUserLinks(req.user.id).map((l) => l.id);

  const valid =
    Array.isArray(ids) &&
    ids.length === own.length &&
    ids.every((id) => own.includes(Number(id)));

  if (!valid) {
    return res.status(400).json({ error: "Invalid order" });
  }

  const update = db.prepare("UPDATE links SET position = ? WHERE id = ? AND user_id = ?");
  const saveOrder = db.transaction((list) => {
    list.forEach((id, index) => update.run(index, Number(id), req.user.id));
  });
  saveOrder(ids);

  res.json({ links: getUserLinks(req.user.id) });
});

router.put("/:id", (req, res) => {
  const link = findOwnLink(req, res);
  if (!link) return;

  const title = req.body.title !== undefined ? String(req.body.title).trim() : link.title;
  if (!title || title.length > 60) {
    return res.status(400).json({ error: "Title is required (max 60 characters)" });
  }

  let url = link.url;
  if (req.body.url !== undefined) {
    url = normalizeUrl(req.body.url);
    if (!url) {
      return res.status(400).json({ error: "Please enter a valid link, like instagram.com/you" });
    }
  }

  const isActive = req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : link.is_active;

  db.prepare("UPDATE links SET title = ?, url = ?, is_active = ? WHERE id = ?")
    .run(title, url, isActive, link.id);

  res.json({ link: db.prepare("SELECT * FROM links WHERE id = ?").get(link.id) });
});

router.delete("/:id", (req, res) => {
  const link = findOwnLink(req, res);
  if (!link) return;

  db.prepare("DELETE FROM links WHERE id = ?").run(link.id);
  res.status(204).end();
});

module.exports = router;
