/* ============================================
   NEXUSHR — auth.js (FINAL FIXED)
============================================ */

const API_URL = "https://8arwk9zb75.execute-api.eu-north-1.amazonaws.com/Dev/employee";

const config = {
  region: "eu-north-1",
  userPoolId: "eu-north-1_ubj9SI8XP",
  clientId: "2fvf922qla1kkvgkctgpl97h9k"
};

/* ============================================
   SESSION
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
   LOGIN (FIXED)
============================================ */
async function loginUser(input, password) {
  const url = `https://cognito-idp.${config.region}.amazonaws.com/`;

  async function attemptLogin(username) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: config.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      })
    });

    return res.json();
  }

  // Try input
  let data = await attemptLogin(input);

  // If email → try username fallback
  if (data.__type && input.includes("@")) {
    const username = input.split("@")[0];
    data = await attemptLogin(username);
  }

  if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    localStorage.setItem("nexushr_challenge", JSON.stringify({
      session: data.Session,
      username: input.includes("@") ? input.split("@")[0] : input
    }));
    return data;
  }

  if (data.AuthenticationResult) {
    setToken(data.AuthenticationResult.IdToken, data.AuthenticationResult.ExpiresIn);
    return data;
  }

  console.error("COGNITO ERROR:", data);

  const code = data.__type || "";

  if (code.includes("NotAuthorizedException"))
    throw new Error("Incorrect email or password.");

  if (code.includes("UserNotFoundException"))
    throw new Error("User not found.");

  throw new Error(data.message || "Sign-in failed.");
}

/* ============================================
   NEW PASSWORD CHALLENGE
============================================ */
async function respondToNewPasswordChallenge(sessionData, newPassword) {
  const stored = JSON.parse(localStorage.getItem("nexushr_challenge") || "null");
  if (!stored) throw new Error("No pending challenge.");

  const url = `https://cognito-idp.${config.region}.amazonaws.com/`;

  const res = await fetch(url, {
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

  const data = await res.json();

  if (data.AuthenticationResult) {
    localStorage.removeItem("nexushr_challenge");
    setToken(data.AuthenticationResult.IdToken, data.AuthenticationResult.ExpiresIn);
    return data;
  }

  throw new Error(data.message || "Failed to set password.");
}

/* ============================================
   AUTH FETCH (FIXED)
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
      "Authorization": `Bearer ${token}`   // 🔥 FIXED
    }
  });
}

/* ============================================
   AUTH GUARD
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
  window.location.href = "login.html";
}
