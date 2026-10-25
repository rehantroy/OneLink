process.env.DB_FILE = ":memory:";
process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-client-id";

const { test, before, after } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const db = require("../src/db");

let server;
let baseUrl;
let rahul;
let priya;

// Google login can't run in tests, so we create users directly
// and sign the same JWT the app would give after login.
function createUser(googleId, name) {
  const result = db
    .prepare("INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)")
    .run(googleId, `${googleId}@test.com`, name);
  const token = jwt.sign({ userId: result.lastInsertRowid }, "test-secret");
  return { id: result.lastInsertRowid, cookie: `token=${token}` };
}

async function request(path, { method = "GET", body, user, redirect } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (user) headers.Cookie = user.cookie;

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: redirect || "follow"
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data, headers: res.headers };
}

before(async () => {
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
  rahul = createUser("g-rahul", "Rahul");
  priya = createUser("g-priya", "Priya");
});

after(() => server.close());

test("protected routes need login", async () => {
  const res = await request("/api/links");
  assert.strictEqual(res.status, 401);
});

test("invalid token is rejected", async () => {
  const res = await request("/api/links", { user: { cookie: "token=fake.token.value" } });
  assert.strictEqual(res.status, 401);
});

test("google login without credential returns 400", async () => {
  const res = await request("/api/auth/google", { method: "POST", body: {} });
  assert.strictEqual(res.status, 400);
});

test("google login without credential and accessToken returns 400", async () => {
  const res = await request("/api/auth/google", {
    method: "POST",
    body: { credential: "", accessToken: "" }
  });
  assert.strictEqual(res.status, 400);
});

test("google login with a fake accessToken returns 401", async () => {
  const res = await request("/api/auth/google", {
    method: "POST",
    body: { accessToken: "fake-access-token" }
  });
  assert.strictEqual(res.status, 401);
});

test("username: too short is rejected", async () => {
  const res = await request("/api/profile", { method: "PUT", body: { username: "ab" }, user: rahul });
  assert.strictEqual(res.status, 400);
});

test("username: reserved words are rejected", async () => {
  const res = await request("/api/profile", { method: "PUT", body: { username: "dashboard" }, user: rahul });
  assert.strictEqual(res.status, 400);
});

test("username: saved in lowercase", async () => {
  const res = await request("/api/profile", { method: "PUT", body: { username: "Rahul_01" }, user: rahul });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.user.username, "rahul_01");
});

test("username: taken username returns 409", async () => {
  const res = await request("/api/profile", { method: "PUT", body: { username: "rahul_01" }, user: priya });
  assert.strictEqual(res.status, 409);
});

test("bio longer than 160 chars is rejected", async () => {
  const res = await request("/api/profile", { method: "PUT", body: { bio: "a".repeat(161) }, user: rahul });
  assert.strictEqual(res.status, 400);
});

test("link without https gets https added", async () => {
  const res = await request("/api/links", {
    method: "POST",
    body: { title: "Instagram", url: "instagram.com/rahul" },
    user: rahul
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.data.link.url, "https://instagram.com/rahul");
});

test("invalid urls are rejected", async () => {
  for (const url of ["", "hello", "javascript:alert(1)", "not a url.com"]) {
    const res = await request("/api/links", { method: "POST", body: { title: "Bad", url }, user: rahul });
    assert.strictEqual(res.status, 400, `expected 400 for "${url}"`);
  }
});

test("link without title is rejected", async () => {
  const res = await request("/api/links", { method: "POST", body: { title: "  ", url: "youtube.com" }, user: rahul });
  assert.strictEqual(res.status, 400);
});

test("user cannot edit or delete someone else's link", async () => {
  const created = await request("/api/links", {
    method: "POST",
    body: { title: "YouTube", url: "https://youtube.com/@rahul" },
    user: rahul
  });
  const id = created.data.link.id;

  const edit = await request(`/api/links/${id}`, { method: "PUT", body: { title: "hacked" }, user: priya });
  assert.strictEqual(edit.status, 403);

  const del = await request(`/api/links/${id}`, { method: "DELETE", user: priya });
  assert.strictEqual(del.status, 403);
});

test("deleting a link that doesn't exist returns 404", async () => {
  const res = await request("/api/links/99999", { method: "DELETE", user: rahul });
  assert.strictEqual(res.status, 404);
});

test("reorder changes the link order", async () => {
  const before = await request("/api/links", { user: rahul });
  const ids = before.data.links.map((l) => l.id).reverse();

  const res = await request("/api/links/reorder", { method: "PUT", body: { ids }, user: rahul });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.data.links.map((l) => l.id), ids);
});

test("reorder with someone else's ids is rejected", async () => {
  const res = await request("/api/links/reorder", { method: "PUT", body: { ids: [1, 2] }, user: priya });
  assert.strictEqual(res.status, 400);
});

test("public page shows only active links", async () => {
  const mine = await request("/api/links", { user: rahul });
  const hidden = mine.data.links[0];
  await request(`/api/links/${hidden.id}`, { method: "PUT", body: { isActive: false }, user: rahul });

  const page = await request("/api/u/rahul_01");
  assert.strictEqual(page.status, 200);
  assert.ok(!page.data.links.some((l) => l.id === hidden.id));
  assert.strictEqual(page.data.links.length, mine.data.links.length - 1);
});

test("public page for unknown username returns 404", async () => {
  const res = await request("/api/u/nobody_here");
  assert.strictEqual(res.status, 404);
});

test("clicking a link redirects and counts the click", async () => {
  const page = await request("/api/u/rahul_01");
  const link = page.data.links[0];

  const res = await request(`/go/${link.id}`, { redirect: "manual" });
  assert.strictEqual(res.status, 302);

  const mine = await request("/api/links", { user: rahul });
  assert.strictEqual(mine.data.links.find((l) => l.id === link.id).clicks, 1);
});

test("clicking a link in the dashboard preview does not count", async () => {
  const page = await request("/api/u/rahul_01");
  const link = page.data.links[0];

  const res = await request(`/go/${link.id}?preview=1`, { redirect: "manual" });
  assert.strictEqual(res.status, 302);

  const mine = await request("/api/links", { user: rahul });
  assert.strictEqual(mine.data.links.find((l) => l.id === link.id).clicks, 1);
});

test("hidden link cannot be opened", async () => {
  const mine = await request("/api/links", { user: rahul });
  const hidden = mine.data.links.find((l) => !l.is_active);
  const res = await request(`/go/${hidden.id}`, { redirect: "manual" });
  assert.strictEqual(res.status, 404);
});

test("broken JSON body returns 400, not a crash", async () => {
  const res = await fetch(baseUrl + "/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: rahul.cookie },
    body: "{bad json"
  });
  assert.strictEqual(res.status, 400);
});
