// script.js — Employee Directory logic

let allEmployees = [];
let pendingDeleteId = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
requireAuth();
buildNavbar("employee.html");
fetchEmployees();

// ─── FETCH ───────────────────────────────────────────────────────────────────
async function fetchEmployees() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Support both {employees:[...]} and raw array
    allEmployees = Array.isArray(data) ? data : (data.employees || data.Items || []);
    renderGrid(allEmployees);
  } catch (e) {
    document.getElementById("employeeGrid").innerHTML =
      `<div class="empty-state">⚠️ Could not load employees.<br><small>${e.message}</small></div>`;
    document.getElementById("countBadge").textContent = "Error";
  }
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function renderGrid(employees) {
  const grid = document.getElementById("employeeGrid");
  const badge = document.getElementById("countBadge");

  badge.textContent = `${employees.length} employee${employees.length !== 1 ? "s" : ""}`;

  if (!employees.length) {
    grid.innerHTML = `<div class="empty-state">No employees found.</div>`;
    return;
  }

  grid.innerHTML = employees.map(emp => {
    const imgUrl = resolveImageUrl(emp.imageUrl || emp.image || emp.photo || emp.s3Key || null);
    const initials = (emp.name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

    const avatarHtml = imgUrl
      ? `<img
           src="${imgUrl}"
           alt="${emp.name}"
           class="emp-avatar-img"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
         /><div class="emp-avatar-fallback" style="display:none">${initials}</div>`
      : `<div class="emp-avatar-fallback">${initials}</div>`;

    return `
      <div class="emp-card" data-id="${emp.empID || emp.id}">
        <div class="emp-card-top">
          <div class="emp-avatar" onclick="openLightbox('${imgUrl || ""}','${esc(emp.name)}','${esc(emp.role)} · ${esc(emp.department)}')">
            ${avatarHtml}
          </div>
          <div class="emp-info">
            <div class="emp-name">${esc(emp.name)}</div>
            <div class="emp-role">${esc(emp.role || "—")}</div>
          </div>
        </div>
        <div class="emp-meta">
          <span class="emp-dept">${esc(emp.department || "—")}</span>
          <span class="emp-id">${esc(emp.empID || emp.id || "—")}</span>
        </div>
        <div class="emp-email">${esc(emp.email || "—")}</div>
        <button class="emp-delete-btn" onclick="openModal('${esc(emp.empID || emp.id)}')">Remove</button>
      </div>
    `;
  }).join("");
}

function esc(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
document.getElementById("searchInput").addEventListener("input", function() {
  const q = this.value.toLowerCase();
  const filtered = allEmployees.filter(e =>
    (e.name || "").toLowerCase().includes(q) ||
    (e.role || "").toLowerCase().includes(q) ||
    (e.department || "").toLowerCase().includes(q) ||
    (e.empID || e.id || "").toLowerCase().includes(q)
  );
  renderGrid(filtered);
});

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────
function openModal(empId) {
  pendingDeleteId = empId;
  document.getElementById("modalEmpId").textContent = empId;
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
  btn.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empID: pendingDeleteId })
    });
    if (!res.ok) throw new Error();
    showToast("Employee removed", "success");
    allEmployees = allEmployees.filter(e => (e.empID || e.id) !== pendingDeleteId);
    renderGrid(allEmployees);
  } catch {
    showToast("Failed to delete", "error");
  } finally {
    btn.textContent = "Delete";
    btn.disabled = false;
    closeModal();
  }
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function openLightbox(imgUrl, name, meta) {
  if (!imgUrl) return;
  document.getElementById("lightboxImg").src = imgUrl;
  document.getElementById("lightboxName").textContent = name;
  document.getElementById("lightboxMeta").textContent = meta;
  document.getElementById("lightbox").classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
}
