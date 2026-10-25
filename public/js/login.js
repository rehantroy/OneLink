const loginError = document.getElementById("loginError");
const googleButton = document.getElementById("googleButton");
let tokenClient = null;

async function handleGoogleLogin(response) {
  loginError.textContent = "";
  try {
    await api("/api/auth/google", {
      method: "POST",
      body: { credential: response.credential }
    });
    window.location.href = "/dashboard";
  } catch (err) {
    loginError.textContent = err.message;
  }
}

// the error text is in the hero, so scroll to it when a footer/navbar button failed
function showLoginError(message) {
  loginError.textContent = message;
  loginError.scrollIntoView({ block: "center" });
}

// called by the "Choose an account" popup
async function handleAccessToken(response) {
  if (response.error) {
    showLoginError("Google sign-in was cancelled. Please try again.");
    return;
  }

  loginError.textContent = "";
  try {
    await api("/api/auth/google", {
      method: "POST",
      body: { accessToken: response.access_token }
    });
    window.location.href = "/dashboard";
  } catch (err) {
    showLoginError(err.message);
  }
}

// called when the popup is blocked or closed by the user
function handlePopupError(error) {
  if (error.type === "popup_failed_to_open") {
    showLoginError("The Google popup was blocked. Please allow popups for this site and try again.");
  } else if (error.type === "popup_closed") {
    showLoginError("The Google window was closed. Click Get started to try again.");
  } else {
    showLoginError("Google sign-in did not work. Please try again.");
  }
}

async function start() {
  // already logged in? go straight to the dashboard
  // (only on the real home page, never inside the dashboard's preview iframe,
  // and not when the dashboard footer sends you to a section like /#features)
  const isHomePage = window.location.pathname === "/" && window.self === window.top;
  if (isHomePage && !window.location.hash) {
    try {
      await api("/api/auth/me");
      window.location.href = "/dashboard";
      return;
    } catch (err) {}
  }

  const { googleClientId } = await api("/api/config");
  if (!googleClientId) {
    loginError.textContent = "Google login is not set up yet (GOOGLE_CLIENT_ID missing in .env)";
    return;
  }

  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleLogin
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: googleClientId,
    scope: "openid email profile",
    prompt: "select_account",
    callback: handleAccessToken,
    error_callback: handlePopupError
  });

  // no width option: Google sizes the button to fit its logo and text
  google.accounts.id.renderButton(googleButton, {
    theme: "filled_black",
    size: "large",
    shape: "pill",
    text: "continue_with",
    logo_alignment: "center"
  });
}

// every "Log in" / "Get started" button opens Google's "Choose an account" popup
function openGoogleLogin() {
  if (!tokenClient) {
    showGoogleButton();
    return;
  }
  tokenClient.requestAccessToken();
}

function showGoogleButton() {
  googleButton.scrollIntoView({ block: "center" });
  googleButton.classList.add("attention");
}

function setupLoginButtons() {
  googleButton.addEventListener("animationend", () => {
    googleButton.classList.remove("attention");
  });

  document.querySelectorAll("[data-login]").forEach((button) => {
    button.addEventListener("click", () => {
      closeMenu();
      openGoogleLogin();
    });
  });
}

function rotateWords() {
  const words = ["Instagram", "YouTube", "portfolio", "music", "store"];
  const target = document.getElementById("rotateWord");
  let index = 0;

  setInterval(() => {
    index = (index + 1) % words.length;
    target.classList.add("out");
    setTimeout(() => {
      target.textContent = words[index];
      target.classList.remove("out");
    }, 300);
  }, 2200);
}

/* ---------- navbar ---------- */

const navbar = document.getElementById("navbar");
const navToggle = document.getElementById("navToggle");

function updateNavbarBackground() {
  navbar.classList.toggle("scrolled", window.scrollY > 10);
}

function openMenu() {
  navbar.classList.add("menu-open");
  navToggle.setAttribute("aria-expanded", "true");
  navToggle.setAttribute("aria-label", "Close menu");
}

function closeMenu() {
  navbar.classList.remove("menu-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open menu");
}

function setupNavbar() {
  updateNavbarBackground();
  window.addEventListener("scroll", updateNavbarBackground, { passive: true });

  navToggle.addEventListener("click", () => {
    if (navbar.classList.contains("menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

// highlight the nav link of the section that is in the middle of the screen
function setupActiveLinks() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("main section[id]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  sections.forEach((section) => observer.observe(section));
}

/* ---------- animations ---------- */

function setupScrollAnimations() {
  const items = document.querySelectorAll(".fade-in");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
}

// background blobs follow the mouse a little (max 20px), desktop only
function setupParallax() {
  const isSmallScreen = window.matchMedia("(max-width: 860px)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isSmallScreen || reduceMotion) return;

  const background = document.querySelector(".background");
  const maxMove = 20;
  let mouseX = 0;
  let mouseY = 0;
  let frameRequested = false;

  function moveBlobs() {
    background.style.setProperty("--mx", mouseX * maxMove + "px");
    background.style.setProperty("--my", mouseY * maxMove + "px");
    frameRequested = false;
  }

  window.addEventListener("mousemove", (event) => {
    // turn the mouse position into a number from -1 to 1
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;

    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(moveBlobs);
    }
  });
}

setupNavbar();
setupActiveLinks();
setupScrollAnimations();
setupParallax();
setupLoginButtons();
rotateWords();
start();
