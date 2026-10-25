const THEMES = {
  lime: "#c6f432",
  violet: "#a98bff",
  coral: "#ff7a59",
  sky: "#3ec7ff"
};

let user = null;
let links = [];
let selectedTheme = "lime";
let editingId = null;
let newLinkId = null;

const linkList = document.getElementById("linkList");
const toast = document.getElementById("toast");

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (toast.className = "toast"), 2500);
}

function pageUrl() {
  return `${window.location.origin}/${user.username}`;
}

function refreshPreview() {
  const phone = document.getElementById("phone");
  phone.innerHTML = "";

  if (!user.username) {
    const empty = document.createElement("div");
    empty.className = "phone-empty";
    empty.textContent = "Save a username to see your page here.";
    phone.appendChild(empty);
    return;
  }

  phone.classList.remove("refresh");
  void phone.offsetWidth;
  phone.classList.add("refresh");

  const frame = document.createElement("iframe");
  frame.src = `/${user.username}?preview=1&t=${Date.now()}`;
  frame.title = "Page preview";
  phone.appendChild(frame);
}

function renderOverview() {
  const pill = document.getElementById("urlPill");
  const myPageBtn = document.getElementById("myPageBtn");

  if (!user.username) {
    pill.hidden = true;
    myPageBtn.hidden = true;
  } else {
    pill.hidden = false;
    myPageBtn.hidden = false;
    myPageBtn.href = `/${user.username}`;
    document.getElementById("shareUrl").textContent = `${window.location.host}/${user.username}`;
  }

  renderAnalytics();
}

function renderAnalytics() {
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const sorted = [...links].sort((a, b) => b.clicks - a.clicks);

  document.getElementById("statLinks").textContent = links.filter((l) => l.is_active).length;
  countUp(document.getElementById("statClicks"), totalClicks);

  const topLink = document.getElementById("statTop");
  topLink.textContent = totalClicks > 0 ? sorted[0].title : "—";
  topLink.title = topLink.textContent;

  const list = document.getElementById("clickBars");
  list.innerHTML = "";

  if (totalClicks === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No clicks yet. Share your page link and clicks will show up here.";
    list.appendChild(empty);
    return;
  }

  const mostClicks = sorted[0].clicks;
  sorted.forEach((link, index) => {
    const item = document.createElement("li");
    item.className = "click-bar";
    item.style.setProperty("--i", index);

    const title = document.createElement("span");
    title.className = "click-bar-title";
    title.textContent = link.title;

    const track = document.createElement("div");
    track.className = "click-bar-track";
    const fill = document.createElement("div");
    fill.className = "click-bar-fill";
    fill.style.width = (link.clicks / mostClicks) * 100 + "%";
    track.appendChild(fill);

    const count = document.createElement("span");
    count.className = "click-bar-count";
    count.textContent = link.clicks;

    item.append(title, track, count);
    list.appendChild(item);
  });
}

function countUp(node, target) {
  const start = Number(node.textContent) || 0;
  if (start === target) return;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / 600, 1);
    node.textContent = Math.round(start + (target - start) * progress);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderThemes() {
  const box = document.getElementById("themes");
  box.innerHTML = "";

  Object.entries(THEMES).forEach(([name, color]) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch" + (name === selectedTheme ? " selected" : "");
    swatch.style.background = color;
    swatch.title = name;
    swatch.addEventListener("click", () => {
      selectedTheme = name;
      document.body.dataset.theme = name;
      renderThemes();
    });
    box.appendChild(swatch);
  });
}

function renderProfile() {
  document.getElementById("usernamePrefix").textContent = window.location.host + "/";
  document.getElementById("username").value = user.username || "";
  document.getElementById("name").value = user.name || "";
  document.getElementById("bio").value = user.bio || "";
  document.getElementById("profileHint").textContent = user.username
    ? "This is what visitors see at the top of your page."
    : "Pick a username to get your page.";

  document.getElementById("firstName").textContent = (user.name || "there").split(" ")[0];
  document.getElementById("menuName").textContent = user.name || "";
  document.getElementById("menuEmail").textContent = user.email || "";
  renderAvatar();

  selectedTheme = user.theme;
  document.body.dataset.theme = user.theme;
  renderThemes();
}

// Google photo if we have one, otherwise the first letter of the name
function renderAvatar() {
  const avatar = document.getElementById("topAvatar");
  const letter = document.getElementById("topAvatarLetter");
  letter.textContent = (user.name || "?").charAt(0).toUpperCase();

  if (!user.avatar) return;
  avatar.src = user.avatar;
  avatar.hidden = false;
  letter.hidden = true;
  avatar.onerror = () => {
    avatar.hidden = true;
    letter.hidden = false;
  };
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch (err) {
    return url;
  }
}

// site favicon from Google, or the first letter if it can't load
function linkIcon(link) {
  const letter = document.createElement("div");
  letter.className = "link-letter";
  letter.textContent = link.title.charAt(0).toUpperCase();

  const img = document.createElement("img");
  img.className = "link-favicon";
  img.alt = "";
  img.loading = "lazy";
  img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostnameOf(link.url))}&sz=64`;
  img.addEventListener("error", () => img.replaceWith(letter));
  return img;
}

function iconButton(label, title, onClick, extraClass = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn " + extraClass;
  btn.textContent = label;
  btn.title = title;
  btn.addEventListener("click", onClick);
  return btn;
}

function renderLinkView(item, link, index) {
  const info = document.createElement("div");
  info.className = "link-info";

  const title = document.createElement("strong");
  title.textContent = link.title;
  const url = document.createElement("small");
  url.textContent = hostnameOf(link.url);
  info.append(title, url);

  const clicks = document.createElement("span");
  clicks.className = "link-clicks";
  clicks.textContent = `${link.clicks} ${link.clicks === 1 ? "click" : "clicks"}`;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "toggle" + (link.is_active ? " on" : "");
  toggle.title = link.is_active ? "Hide from page" : "Show on page";
  toggle.addEventListener("click", () => updateLink(link.id, { isActive: !link.is_active }));

  const actions = document.createElement("div");
  actions.className = "link-actions";

  const up = iconButton("↑", "Move up", () => moveLink(index, -1));
  up.disabled = index === 0;
  const down = iconButton("↓", "Move down", () => moveLink(index, 1));
  down.disabled = index === links.length - 1;

  actions.append(
    up,
    down,
    iconButton("✎", "Edit", () => {
      editingId = link.id;
      renderLinks();
    }),
    iconButton("✕", "Delete", () => deleteLink(link), "delete")
  );

  item.append(linkIcon(link), info, clicks, toggle, actions);
}

function renderLinkEdit(item, link) {
  const form = document.createElement("form");
  form.className = "edit-form";

  const titleInput = document.createElement("input");
  titleInput.value = link.title;
  titleInput.maxLength = 60;

  const urlInput = document.createElement("input");
  urlInput.value = link.url;

  const buttons = document.createElement("div");
  buttons.className = "edit-buttons";

  const save = document.createElement("button");
  save.className = "btn";
  save.textContent = "Save";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn-ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    editingId = null;
    renderLinks();
  });

  buttons.append(save, cancel);
  form.append(titleInput, urlInput, buttons);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await updateLink(link.id, { title: titleInput.value, url: urlInput.value });
    if (ok) editingId = null;
    renderLinks();
  });

  item.appendChild(form);
  titleInput.focus();
}

function renderLinks() {
  linkList.innerHTML = "";

  if (!links.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No links yet. Add your first one above.";
    linkList.appendChild(empty);
  }

  links.forEach((link, index) => {
    const item = document.createElement("li");
    item.className = "link-item" + (link.is_active ? "" : " off");
    if (link.id === newLinkId) {
      item.classList.add("just-added");
      newLinkId = null;
    }

    if (editingId === link.id) {
      renderLinkEdit(item, link);
    } else {
      renderLinkView(item, link, index);
    }
    linkList.appendChild(item);
  });

  renderOverview();
}

async function updateLink(id, changes) {
  try {
    const { link } = await api(`/api/links/${id}`, { method: "PUT", body: changes });
    links = links.map((l) => (l.id === id ? link : l));
    renderLinks();
    refreshPreview();
    return true;
  } catch (err) {
    showToast(err.message, true);
    return false;
  }
}

async function deleteLink(link) {
  if (!confirm(`Delete "${link.title}"?`)) return;
  try {
    await api(`/api/links/${link.id}`, { method: "DELETE" });
    links = links.filter((l) => l.id !== link.id);
    renderLinks();
    refreshPreview();
    showToast("Link deleted");
  } catch (err) {
    showToast(err.message, true);
  }
}

async function moveLink(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= links.length) return;

  const ids = links.map((l) => l.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];

  try {
    const data = await api("/api/links/reorder", { method: "PUT", body: { ids } });
    links = data.links;
    renderLinks();
    refreshPreview();
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/profile", {
      method: "PUT",
      body: {
        username: document.getElementById("username").value,
        name: document.getElementById("name").value,
        bio: document.getElementById("bio").value,
        theme: selectedTheme
      }
    });
    user = data.user;
    renderProfile();
    renderOverview();
    refreshPreview();
    showToast("Profile saved");
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("addLinkForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const titleInput = document.getElementById("linkTitle");
  const urlInput = document.getElementById("linkUrl");

  try {
    const { link } = await api("/api/links", {
      method: "POST",
      body: { title: titleInput.value, url: urlInput.value }
    });
    links.push(link);
    newLinkId = link.id;
    titleInput.value = "";
    urlInput.value = "";
    titleInput.focus();
    renderLinks();
    refreshPreview();
    showToast("Link added");
  } catch (err) {
    showToast(err.message, true);
  }
});

async function copyPageLink() {
  if (!user.username) {
    showToast("Save a username first", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(pageUrl());
    showToast("Link copied");
  } catch (err) {
    showToast("Could not copy, select the link and copy it", true);
  }
}

document.getElementById("copyBtn").addEventListener("click", copyPageLink);
document.getElementById("menuCopyBtn").addEventListener("click", () => {
  closeAccountMenu();
  copyPageLink();
});

/* ---------- tabs ---------- */

const TAB_NAMES = ["links", "appearance", "analytics"];
const TAB_KEY = "onelink-tab";

function savedTab() {
  try {
    const name = localStorage.getItem(TAB_KEY);
    return TAB_NAMES.includes(name) ? name : "links";
  } catch (err) {
    return "links";
  }
}

function showTab(name) {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    const isActive = tab.dataset.tab === name;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });
  moveTabIndicator();

  try {
    localStorage.setItem(TAB_KEY, name);
  } catch (err) {}
}

// slide the accent underline under the active tab
function moveTabIndicator() {
  const activeTab = document.querySelector(".dash-tab.active");
  const indicator = document.getElementById("tabIndicator");
  indicator.style.width = activeTab.offsetWidth + "px";
  indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
}

document.querySelectorAll(".dash-tab").forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
});
window.addEventListener("resize", moveTabIndicator);
window.addEventListener("load", moveTabIndicator);

/* ---------- account menu ---------- */

const avatarBtn = document.getElementById("avatarBtn");
const accountMenu = document.getElementById("accountMenu");

function openAccountMenu() {
  accountMenu.hidden = false;
  avatarBtn.setAttribute("aria-expanded", "true");
}

function closeAccountMenu() {
  accountMenu.hidden = true;
  avatarBtn.setAttribute("aria-expanded", "false");
}

avatarBtn.addEventListener("click", () => {
  if (accountMenu.hidden) {
    openAccountMenu();
  } else {
    closeAccountMenu();
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".account")) closeAccountMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !accountMenu.hidden) {
    closeAccountMenu();
    avatarBtn.focus();
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

showTab(savedTab());

async function init() {
  try {
    const me = await api("/api/auth/me");
    user = me.user;
  } catch (err) {
    window.location.href = "/";
    return;
  }

  const data = await api("/api/links");
  links = data.links;

  renderProfile();
  renderLinks();
  refreshPreview();
}

init();
