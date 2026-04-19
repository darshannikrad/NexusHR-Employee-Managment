// script.js — Employee Directory

let allEmployees    = [];
let pendingDeleteId = null;

// ─── DARK / LIGHT MODE ───────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("nexushr_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next    = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("nexushr_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

initTheme();

// ─── INIT ─────────────────────────────────────────────────────────────────────
function waitForCognitoAndInit() {
  if (window.AmazonCognitoIdentity) {
    requireAuth();
    buildNavbar("employee.html");
    // Inject theme toggle button into navbar after it's built
    injectThemeToggle();
    fetchEmployees();
  } else {
    setTimeout(waitForCognitoAndInit, 50);
  }
}
waitForCognitoAndInit();

function injectThemeToggle() {
  const navRight = document.querySelector(".nav-right");
  if (!navRight) return;
  const btn = document.createElement("button");
  btn.id        = "themeToggle";
  btn.className = "btn-theme-toggle";
  btn.onclick   = toggleTheme;
  btn.title     = "Toggle dark/light mode";
  updateThemeIcon(document.documentElement.getAttribute("data-theme") || "dark");
  btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
  navRight.insertBefore(btn, navRight.firstChild);
}

// ─── FIX S3 URL ───────────────────────────────────────────────────────────────
// The Lambda stores URLs like:
//   https://employee-profile-yash-2026-project.s3.amazonaws.com/employees/...
// These fail because the bucket is in eu-north-1 but no region is in the URL.
// We rewrite them to the region-specific form.
function fixS3Url(url) {
  if (!url) return null;
  // Already has region — fine
  if (url.includes(".s3.eu-north-1.amazonaws.com")) return url;
  // Rewrite regionless URL → region-specific
  if (url.includes(".s3.amazonaws.com")) {
    return url.replace(".s3.amazonaws.com", ".s3.eu-north-1.amazonaws.com");
  }
  // resolveImageUrl handles s3:// and plain keys
  return resolveImageUrl(url);
}

// ─── FETCH EMPLOYEES ──────────────────────────────────────────────────────────
async function fetchEmployees() {
  try {
    const token = sessionStorage.getItem("nexushr_token");
    const res   = await fetch(API_URL, {
      headers: token ? { "Authorization": token } : {}
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // API returns { count, employees: [...] }
    allEmployees = data.employees || data.Items || (Array.isArray(data) ? data : []);

    renderGrid(allEmployees);
  } catch (e) {
    document.getElementById("employeeGrid").innerHTML =
      `<div class="empty-state">⚠️ Could not load employees.<br><small>${e.message}</small></div>`;
    document.getElementById("countBadge").textContent = "Error";
  }
}

// ─── RENDER GRID ─────────────────────────────────────────────────────────────
function renderGrid(employees) {
  const grid  = document.getElementById("employeeGrid");
  const badge = document.getElementById("countBadge");

  badge.textContent = `${employees.length} employee${employees.length !== 1 ? "s" : ""}`;

  if (!employees.length) {
    grid.innerHTML = `<div class="empty-state">No employees found.</div>`;
    return;
  }

  grid.innerHTML = employees.map(emp => {
    // ✅ Correct field name from your API is "photoUrl"
    const rawImg   = emp.photoUrl || emp.imageUrl || emp.image || emp.photo || emp.s3Key || null;
    const imgUrl   = fixS3Url(rawImg);
    const id       = emp.empID || emp.EmployeeID || emp.id || "—";
    const name     = emp.name  || emp.Name       || "Unknown";
    const role     = emp.role  || emp.Role       || "—";
    const dept     = emp.department || emp.Department || "—";
    const email    = emp.email || emp.Email || "—";
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    const avatarHtml = imgUrl
      ? `<img
           src="${imgUrl}"
           alt="${esc(name)}"
           class="emp-avatar-img"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
         /><div class="emp-avatar-fallback" style="display:none">${initials}</div>`
      : `<div class="emp-avatar-fallback">${initials}</div>`;

    return `
      <div class="emp-card">
        <div class="emp-card-top">
          <div class="emp-avatar" onclick="openLightbox('${esc(imgUrl||"")}','${esc(name)}','${esc(role)} · ${esc(dept)}')">
            ${avatarHtml}
          </div>
          <div class="emp-info">
            <div class="emp-name">${esc(name)}</div>
            <div class="emp-role">${esc(role)}</div>
          </div>
        </div>
        <div class="emp-meta">
          <span class="emp-dept">${esc(dept)}</span>
          <span class="emp-id">${esc(id)}</span>
        </div>
        <div class="emp-email">${esc(email)}</div>
        <button class="emp-delete-btn" onclick="openModal('${esc(id)}','${esc(name)}')">Remove</button>
      </div>
    `;
  }).join("");
}

function esc(str) {
  return String(str || "")
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
document.getElementById("searchInput").addEventListener("input", function () {
  const q = this.value.toLowerCase();
  const filtered = allEmployees.filter(e =>
    (e.name       || "").toLowerCase().includes(q) ||
    (e.role       || "").toLowerCase().includes(q) ||
    (e.department || "").toLowerCase().includes(q) ||
    (e.empID      || e.id || "").toLowerCase().includes(q)
  );
  renderGrid(filtered);
});

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────
function openModal(empId, empName) {
  pendingDeleteId = empId;
  document.getElementById("modalEmpId").textContent = empName ? `${empName} (${empId})` : empId;
  document.getElementById("deleteModal").classList.add("open");
}

function closeModal() {
  pendingDeleteId = null;
  document.getElementById("deleteModal").classList.remove("open");
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const btn = document.getElementById("confirmDelBtn");
  btn.textContent = "Deleting…";
  btn.disabled    = true;

  try {
    const token = sessionStorage.getItem("nexushr_token");
    const res   = await fetch(API_URL, {
      method:  "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": token } : {})
      },
      body: JSON.stringify({ empID: pendingDeleteId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast("Employee removed successfully", "success");
    allEmployees = allEmployees.filter(e => (e.empID || e.id) !== pendingDeleteId);
    renderGrid(allEmployees);
  } catch (e) {
    showToast("Failed to delete employee", "error");
  } finally {
    btn.textContent = "Delete";
    btn.disabled    = false;
    closeModal();
  }
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function openLightbox(imgUrl, name, meta) {
  if (!imgUrl) return;
  document.getElementById("lightboxImg").src              = imgUrl;
  document.getElementById("lightboxName").textContent     = name;
  document.getElementById("lightboxMeta").textContent     = meta;
  document.getElementById("lightbox").classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
}
