/*
  script.js — NexusHR (FINAL STABLE VERSION)
*/

// 🔐 Protect page
requireAuth();

/* ============================================
   GLOBAL STATE
============================================ */
let allEmployees = [];

/* ============================================
   LOAD EMPLOYEES (GRID + IMAGE FIX)
============================================ */
async function loadEmployees() {
  const grid = document.getElementById("employeeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const BUCKET_URL = "https://employee-profile-yash-2026-project.s3.eu-north-1.amazonaws.com/";

  try {
    const res  = await authFetch(API_URL);
    const raw  = await res.json();

    console.log("DATA:", raw);

    const list = Array.isArray(raw.employees)
      ? raw.employees
      : (Array.isArray(raw) ? raw : []);

    if (!list.length) {
      grid.innerHTML = `<div>No employees found</div>`;
      return;
    }

    list.forEach(emp => {
      const imageUrl = emp.photoUrl
        ? BUCKET_URL + emp.photoUrl
        : null;

      const card = document.createElement("div");
      card.className = "emp-card";

      card.innerHTML = `
        <div class="emp-card-header">
          ${
            imageUrl
              ? `<img src="${imageUrl}" class="emp-avatar" />`
              : `<div class="emp-avatar-placeholder">${(emp.name || "?")[0]}</div>`
          }
          <div>
            <div class="emp-name">${emp.name ?? "-"}</div>
            <div class="emp-role">${emp.role ?? "-"}</div>
          </div>
        </div>

        <div class="emp-card-body">
          <div>${emp.email ?? "-"}</div>
          <div>${emp.department ?? "-"}</div>
          <div>${emp.empID ?? "-"}</div>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (e) {
    console.error("ERROR:", e);
    grid.innerHTML = `<div>Could not load employees</div>`;
  }
}

/* ============================================
   ADD EMPLOYEE
============================================ */
async function addEmployee() {
  const name = document.getElementById("name")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const role  = document.getElementById("role")?.value?.trim();
  const department = document.getElementById("department")?.value?.trim();
  const file  = document.getElementById("photo")?.files[0];

  if (!name || !email || !role || !department) {
    showToast("Fill all required fields", "error");
    return;
  }

  let imageBase64 = null, imageType = null;

  if (file) {
    imageBase64 = await getBase64(file);
    imageType = file.type;
  }

  try {
    const token = localStorage.getItem("nexushr_idToken");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ name, email, role, department, imageBase64, imageType })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed");

    showToast("Employee added!", "success");

    loadEmployees(); // 🔥 FIXED

  } catch (e) {
    console.error(e);
    showToast(e.message || "Failed to add", "error");
  }
}

/* ============================================
   DELETE EMPLOYEE
============================================ */
async function confirmDelete() {
  if (!pendingDeleteId) return;

  try {
    const token = localStorage.getItem("nexushr_idToken");

    const res = await fetch(API_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ empID: pendingDeleteId })
    });

    if (!res.ok) throw new Error();

    showToast("Employee removed", "success");

    closeModal();
    loadEmployees(); // 🔥 FIXED

  } catch (e) {
    console.error(e);
    showToast("Failed to delete", "error");
  }
}

/* ============================================
   UPDATE EMPLOYEE
============================================ */
async function updateEmployee() {
  const empID = document.getElementById("empID")?.value?.trim();

  if (!empID) {
    showToast("Enter Employee ID", "error");
    return;
  }

  const data = {};

  const name = document.getElementById("name")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const role  = document.getElementById("role")?.value?.trim();
  const department = document.getElementById("department")?.value?.trim();

  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (department) data.department = department;

  if (!Object.keys(data).length) {
    showToast("Enter at least one field", "error");
    return;
  }

  try {
    const token = localStorage.getItem("nexushr_idToken");

    const res = await fetch(
      `https://8arwk9zb75.execute-api.eu-north-1.amazonaws.com/updateStage/employee/${empID}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify(data)
      }
    );

    const result = await res.json();

    if (!res.ok) throw new Error(result.message || "Failed");

    showToast("Employee updated!", "success");

    loadEmployees(); // 🔥 FIXED

  } catch (e) {
    console.error(e);
    showToast(e.message || "Error updating", "error");
  }
}

/* ============================================
   AUTO LOAD
============================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadEmployees();
});
