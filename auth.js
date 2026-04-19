/* ============================================
   NEXUSHR — auth.js (REAL AUTH - COGNITO)
============================================ */

const API_URL = "https://8arwk9zb75.execute-api.eu-north-1.amazonaws.com/Dev/employee";

/* ============================================
   COGNITO CONFIG
============================================ */
const config = {
  region: "eu-north-1",
  userPoolId: "eu-north-1_ubj9SI8XP",
  clientId: "kvbcpsgg1hrv0gls26e33mk8s"
};

/* ============================================
   SESSION  (localStorage + expiry check)
============================================ */
function getToken() {
  const expiry = localStorage.getItem("nexushr_token_expiry");
  if (expiry && Date.now() > parseInt(expiry)) {
    clearSession();
    return null;
  }
  return localStorage.getItem("nexushr_idToken");
}

function setToken(idToken, expiresIn = 3600) {
  localStorage.setItem("nexushr_idToken", idToken);
  localStorage.setItem("nexushr_token_expiry", Date.now() + expiresIn * 1000);
}

function clearSession() {
  localStorage.removeItem("nexushr_idToken");
  localStorage.removeItem("nexushr_token_expiry");
  localStorage.removeItem("nexushr_challenge");
}

/* ============================================
   LOGIN (COGNITO)
   Called as: loginUser(email, password)
============================================ */
async function loginUser(email, password) {
  const url = `https://cognito-idp.${config.region}.amazonaws.com/`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    })
  });

  const data = await response.json();

  if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    // Save session so respondToNewPasswordChallenge can use it
    localStorage.setItem("nexushr_challenge", JSON.stringify({
      session: data.Session,
      username: email
    }));
    // Return the raw Cognito response so login.html can check ChallengeName directly
    return data;
  }

  if (data.AuthenticationResult) {
    setToken(data.AuthenticationResult.IdToken, data.AuthenticationResult.ExpiresIn);
    return data;
  }

  // Throw a readable error so login.html catch block gets it
  const code = data.__type || "";
  if (code.includes("NotAuthorizedException"))   throw new Error("Incorrect email or password.");
  if (code.includes("UserNotFoundException"))     throw new Error("No account found with this email.");
  if (code.includes("UserNotConfirmedException")) throw new Error("Account not confirmed. Contact your administrator.");
  throw new Error(data.message || "Sign-in failed.");
}

/* ============================================
   HANDLE NEW PASSWORD CHALLENGE
   Called as: respondToNewPasswordChallenge(sessionData, newPassword)
   sessionData = the raw Cognito response from loginUser()
============================================ */
async function respondToNewPasswordChallenge(sessionData, newPassword) {
  const stored = JSON.parse(localStorage.getItem("nexushr_challenge") || "null");
  if (!stored) throw new Error("No pending challenge. Please sign in again.");

  const url = `https://cognito-idp.${config.region}.amazonaws.com/`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge"
    },
    body: JSON.stringify({
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      ClientId: config.clientId,
      Session: stored.session,
      ChallengeResponses: {
        USERNAME: stored.username,
        NEW_PASSWORD: newPassword
      }
    })
  });

  const data = await response.json();

  if (data.AuthenticationResult) {
    localStorage.removeItem("nexushr_challenge");
    setToken(data.AuthenticationResult.IdToken, data.AuthenticationResult.ExpiresIn);
    return data;
  }

  throw new Error(data.message || "Failed to set new password.");
}

/* ============================================
   AUTH FETCH — attaches JWT to every API call
   FIX: Cognito Authorizer needs raw token, NOT "Bearer <token>"
============================================ */
async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    throw new Error("Not authenticated");
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      "Authorization": token        // ← raw JWT, no "Bearer" prefix
    }
  });
}

/* ============================================
   AUTH GUARD — call at top of protected pages
============================================ */
function requireAuth() {
  if (!getToken()) {
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
  showToast("Signed out.", "info");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
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
   TOAST
============================================ */
function showToast(message, type = "info", duration = 3500) {
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
    toast.style.transition = "all 0.3s ease";
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
  initTheme();
});
