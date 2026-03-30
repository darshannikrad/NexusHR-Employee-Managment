/* ============================================
   NEXUSHR — auth.js
   Handles: login, signup, logout, theme toggle, user menu
   Uses: localStorage for session simulation
============================================ */

const API_URL = "https://8arwk9zb75.execute-api.eu-north-1.amazonaws.com/Dev/employee";

/* ---- DEMO CREDENTIALS ---- */
const DEMO_USER = { email: "demo@nexushr.com", password: "demo1234", name: "Demo User" };

/* ============================================
   SESSION HELPERS
============================================ */
function getSession() {
  try { return JSON.parse(localStorage.getItem("nexushr_session") || "null"); } catch { return null; }
}
function setSession(user) {
  localStorage.setItem("nexushr_session", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("nexushr_session");
}

/* ---- Get users store ---- */
function getUsers() {
  try { return JSON.parse(localStorage.getItem("nexushr_users") || "[]"); } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem("nexushr_users", JSON.stringify(users));
}
function ensureDemoUser() {
  const users = getUsers();
  if (!users.find(u => u.email === DEMO_USER.email)) {
    users.push(DEMO_USER);
    saveUsers(users);
  }
}

/* ============================================
   THEME
============================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("nexushr_theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
function initTheme() {
  const saved = localStorage.getItem("nexushr_theme") || "light";
  applyTheme(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

/* ============================================
   NAVBAR INJECTION
============================================ */
function buildNavbar(activePage) {
  const session = getSession();
  const initials = session ? session.name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase() : "?";

  const pages = [
    { href: "index.html",      label: "Home" },
    { href: "employee.html",   label: "Directory" },
    { href: "operations.html", label: "Operations" },
    { href: "update.html",     label: "Update" },
    { href: "project.html",    label: "About" },
    { href: "contact.html",    label: "Contact" },
  ];

  const links = pages.map(p =>
    `<a href="${p.href}" class="nav-link${activePage === p.href ? " active" : ""}">${p.label}</a>`
  ).join("");

  const userSection = session ? `
    <div class="user-menu-wrap">
      <button class="user-btn" id="userMenuBtn" onclick="toggleUserMenu()">
        <div class="user-avatar">${initials}</div>
        <span class="user-name">${session.name}</span>
        <span class="user-caret">▾</span>
      </button>
      <div class="user-dropdown" id="userDropdown">
        <div class="dropdown-header">
          <div class="dropdown-user-name">${session.name}</div>
          <div class="dropdown-user-email">${session.email}</div>
        </div>
        <a href="employee.html" class="dropdown-item">👥 Directory</a>
        <a href="operations.html" class="dropdown-item">⚙️ Operations</a>
        <a href="update.html" class="dropdown-item">✏️ Update Employee</a>
        <button class="dropdown-item danger" onclick="logout()">🚪 Sign Out</button>
      </div>
    </div>
    <a href="operations.html" class="btn-nav">+ Add Employee</a>
  ` : `
    <a href="login.html" class="btn-nav">Sign In</a>
  `;

  document.getElementById("navbar").innerHTML = `
    <a href="index.html" class="nav-brand">
      <div class="nav-brand-icon">N</div>
      <span class="nav-brand-name">NexusHR</span>
    </a>
    <div class="nav-links">${links}</div>
    <div class="nav-right">
      <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle theme">🌙</button>
      ${userSection}
    </div>
  `;

  initTheme(); // re-apply after rebuild to set icon
  document.getElementById("themeToggle").textContent =
    (document.documentElement.getAttribute("data-theme") === "dark") ? "☀️" : "🌙";

  // Close dropdown when clicking outside
  document.addEventListener("click", e => {
    const wrap = document.getElementById("userMenuBtn");
    const dd   = document.getElementById("userDropdown");
    if (wrap && dd && !wrap.contains(e.target) && !dd.contains(e.target)) {
      dd.classList.remove("open");
    }
  });
}

function toggleUserMenu() {
  document.getElementById("userDropdown")?.classList.toggle("open");
}

/* ============================================
   AUTH GUARD — call on protected pages
============================================ */
function requireAuth() {
  if (!getSession()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* ============================================
   LOGOUT
============================================ */
function logout() {
  clearSession();
  showToast("Signed out. See you soon!", "info");
  setTimeout(() => { window.location.href = "login.html"; }, 900);
}

/* ============================================
   TOAST
============================================ */
function showToast(message, type = "info", duration = 4000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "all 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ============================================
   FILE TO BASE64
============================================ */
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---- Init on every page ---- */
document.addEventListener("DOMContentLoaded", () => {
  ensureDemoUser();
  initTheme();
});
