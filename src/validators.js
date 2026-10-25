const RESERVED = ["api", "go", "dashboard", "login", "logout", "admin", "css", "js", "index", "settings"];
const THEMES = ["lime", "violet", "coral", "sky"];

function checkUsername(value) {
  const username = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username must be 3-20 characters: letters, numbers or _" };
  }
  if (RESERVED.includes(username)) {
    return { error: "This username is not allowed" };
  }
  return { username };
}

// adds https:// when missing and only allows http/https links
function normalizeUrl(value) {
  let url = String(value || "").trim();
  if (!url) return null;

  if (!/^[a-z]+:/i.test(url)) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

module.exports = { checkUsername, normalizeUrl, THEMES };
