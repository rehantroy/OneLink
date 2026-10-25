const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const config = require("../config");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const googleClient = new OAuth2Client(config.googleClientId);

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    username: user.username,
    bio: user.bio,
    theme: user.theme
  };
}

// ID token from the rendered Google button
async function profileFromCredential(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: config.googleClientId
  });
  return ticket.getPayload();
}

// access token from the "Choose an account" popup (OAuth2 token client)
async function profileFromAccessToken(accessToken) {
  const tokenInfo = await googleClient.getTokenInfo(accessToken);

  // the token must be made for OUR app, not some other app
  if (tokenInfo.aud !== config.googleClientId) {
    throw new Error("Token was issued to another app");
  }
  if (tokenInfo.email_verified !== undefined && String(tokenInfo.email_verified) !== "true") {
    throw new Error("Email is not verified");
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error("Could not load Google profile");
  }

  const profile = await response.json();
  if (profile.sub !== tokenInfo.sub) {
    throw new Error("Profile does not match token");
  }
  return profile;
}

// create the user on first login, then set the login cookie
function loginUser(res, profile) {
  let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(profile.sub);

  if (user) {
    db.prepare("UPDATE users SET email = ?, avatar = ? WHERE id = ?")
      .run(profile.email, profile.picture, user.id);
  } else {
    const result = db
      .prepare("INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)")
      .run(profile.sub, profile.email, profile.name || profile.email, profile.picture);
    user = { id: result.lastInsertRowid };
  }

  user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ user: publicUser(user) });
}

router.post("/google", async (req, res) => {
  const { credential, accessToken } = req.body;
  if (!credential && !accessToken) {
    return res.status(400).json({ error: "Google credential is missing" });
  }

  let profile;
  try {
    if (credential) {
      profile = await profileFromCredential(credential);
    } else {
      profile = await profileFromAccessToken(accessToken);
    }
  } catch (err) {
    return res.status(401).json({ error: "Google login failed" });
  }

  loginUser(res, profile);
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

module.exports = { router, publicUser };
