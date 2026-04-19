// ─── AWS COGNITO CONFIG ───────────────────────────────────────────────────────
const COGNITO_REGION = "eu-north-1";
const USER_POOL_ID   = "eu-north-1_ubj9SI8XP";
const CLIENT_ID      = "844o3jv36g0bppt9sbfns0he5";

// ─── API & S3 CONFIG ──────────────────────────────────────────────────────────
// 🔴 Replace with your actual API Gateway invoke URL
const API_URL     = "https://8arwk9zb75.execute-api.eu-north-1.amazonaws.com/Dev/employee";

const S3_BUCKET   = "employee-profile-yash-2026-project";
const S3_REGION   = "eu-north-1"; // ✅ confirmed
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;

// ─── THEME ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next    = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("nexushr_theme", next);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
}

// Apply saved theme immediately on every page load
(function applyTheme() {
  const saved = localStorage.getItem("nexushr_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
})();

// ─── LOAD COGNITO SDK (amazon-cognito-identity-js via CDN) ────────────────────
// This loads the SDK synchronously before any auth function is called.
(function loadCognitoSDK() {
  if (window.AmazonCognitoIdentity) return;
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@6/dist/amazon-cognito-identity.min.js";
  s.async = false;
  document.head.appendChild(s);
})();

function getUserPool() {
  return new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId:   CLIENT_ID,
  });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// Called from login.html as: await loginUser(email, password)
function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();

    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool:     pool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess(session) {
        const idToken = session.getIdToken().getJwtToken();
        sessionStorage.setItem("nexushr_token", idToken);
        sessionStorage.setItem("nexushr_user",  email);
        resolve(session);
      },
      onFailure(err) {
        reject(new Error(err.message || "Login failed. Check your email and password."));
      },
      newPasswordRequired() {
        reject(new Error("A new password is required. Please contact your admin."));
      },
    });
  });
}

// ─── REQUIRE AUTH ─────────────────────────────────────────────────────────────
// Call on every protected page. Redirects to login.html if session is invalid.
function requireAuth() {
  const pool        = getUserPool();
  const cognitoUser = pool.getCurrentUser();

  if (!cognitoUser) {
    window.location.href = "login.html";
    return;
  }

  cognitoUser.getSession((err, session) => {
    if (err || !session || !session.isValid()) {
      sessionStorage.clear();
      window.location.href = "login.html";
      return;
    }
    // Refresh stored token with the latest valid one
    sessionStorage.setItem("nexushr_token", session.getIdToken().getJwtToken());
    sessionStorage.setItem("nexushr_user",  cognitoUser.getUsername());
  });
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function doLogout() {
  const pool        = getUserPool();
  const cognitoUser = pool.getCurrentUser();
  if (cognitoUser) cognitoUser.signOut();
  sessionStorage.clear();
  window.location.href = "login.html";
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function buildNavbar(activePage) {
  const nav = document.getElementById("navbar");
  if (!nav) return;

  const links = [
    { href: "index.html",      label: "Home"      },
    { href: "employee.html",   label: "Directory" },
    { href: "operations.html", label: "Manage"    },
    { href: "contact.html",    label: "Contact"   },
  ];

  const linksHtml = links.map(l => `
    <a href="${l.href}" class="nav-link ${activePage === l.href ? "nav-active" : ""}">${l.label}</a>
  `).join("");

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-brand">
        <span class="brand-dot"></span>NexusHR
      </a>
      <div class="nav-links">${linksHtml}</div>
      <div class="nav-right">
        <button id="themeToggle" class="btn-theme-toggle" onclick="toggleTheme()" title="Toggle dark/light mode"></button>
        <button class="btn-logout" onclick="doLogout()">Logout</button>
      </div>
      <button class="nav-toggle" onclick="toggleMobileNav()">☰</button>
    </div>
    <div class="nav-mobile" id="navMobile">
      ${linksHtml}
      <button class="btn-logout" style="margin:12px 0 4px" onclick="doLogout()">Logout</button>
    </div>
  `;
  // Set theme icon after navbar DOM is ready
  const _t = localStorage.getItem("nexushr_theme") || "dark";
  const _b = document.getElementById("themeToggle");
  if (_b) _b.textContent = _t === "dark" ? "☀️" : "🌙";
}

function toggleMobileNav() {
  const m = document.getElementById("navMobile");
  if (m) m.classList.toggle("open");
}

// ─── S3 IMAGE URL RESOLVER ───────────────────────────────────────────────────
// Converts s3:// URIs, plain keys, or existing https:// URLs → proper public HTTPS URL
function resolveImageUrl(raw) {
  if (!raw) return null;
  if (raw.startsWith("https://")) return raw;
  if (raw.startsWith("s3://")) {
    const key = raw.replace(/^s3:\/\/[^/]+\//, "");
    return `${S3_BASE_URL}/${key}`;
  }
  // Plain key e.g. "employees/photo.jpg"
  return `${S3_BASE_URL}/${raw}`;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

// ─── UTILITY ─────────────────────────────────────────────────────────────────
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
