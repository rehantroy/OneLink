const root = document.getElementById("root");
const username = window.location.pathname.slice(1);

// the dashboard shows this page inside an iframe with ?preview=1
const isPreview = new URLSearchParams(window.location.search).has("preview");
if (isPreview) {
  document.documentElement.classList.add("preview");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// inside the preview, links must open in a new tab, not inside the small phone frame
function openOutsidePreview(link) {
  if (isPreview) {
    link.target = "_blank";
    link.rel = "noopener";
  }
}

function showNotFound() {
  document.title = "Page not found - OneLink";
  const box = el("div", "not-found");
  box.append(
    el("h1", "", "This page doesn't exist yet"),
    el("p", "", `Nobody has claimed /${username}. It could be yours.`)
  );
  const btn = el("a", "btn", "Create your page");
  btn.href = "/";
  btn.style.textDecoration = "none";
  openOutsidePreview(btn);
  box.appendChild(btn);
  root.appendChild(box);
}

function showPage(data) {
  document.title = `${data.name} (@${data.username}) - OneLink`;
  document.body.dataset.theme = data.theme;

  const page = el("div", "page");

  if (data.avatar) {
    const img = el("img", "avatar");
    img.src = data.avatar;
    img.alt = data.name;
    img.referrerPolicy = "no-referrer";
    page.appendChild(img);
  } else {
    page.appendChild(el("div", "avatar-letter", data.name.charAt(0).toUpperCase()));
  }

  page.append(el("h1", "", data.name), el("div", "page-handle", "@" + data.username));
  if (data.bio) page.appendChild(el("p", "page-bio", data.bio));

  const list = el("ul", "page-links");
  data.links.forEach((link, index) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", index);
    const a = el("a", "", link.title);
    // ?preview=1 tells the server not to count this click
    a.href = isPreview ? `/go/${link.id}?preview=1` : `/go/${link.id}`;
    a.target = "_blank";
    a.rel = "noopener";
    li.appendChild(a);
    list.appendChild(li);
  });
  page.appendChild(list);

  if (!data.links.length) {
    page.appendChild(el("p", "page-bio", "No links here yet."));
  }

  const footer = el("div", "page-footer");
  const brand = el("a", "logo", "");
  brand.href = "/";
  openOutsidePreview(brand);
  brand.innerHTML = '<svg class="logo-mark" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect class="logo-bg" width="28" height="28" rx="8"/><g class="logo-links" fill="none" stroke="#0a0a0a" stroke-width="2.5" stroke-linecap="round"><g transform="rotate(-45 14 14)"><rect x="5.5" y="10.5" width="10" height="7" rx="3.5"/><rect x="12.5" y="10.5" width="10" height="7" rx="3.5"/></g></g></svg><span class="logo-word">one<span>link</span></span>';
  const createLink = el("a", "page-footer-link", "Create your own page");
  createLink.href = "/";
  openOutsidePreview(createLink);

  footer.append(brand, createLink);
  page.appendChild(footer);

  root.appendChild(page);
  document.body.appendChild(el("div", "glow"));
}

api(`/api/u/${encodeURIComponent(username)}`)
  .then(showPage)
  .catch(showNotFound);
