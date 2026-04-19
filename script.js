/*
  script.js — NexusHR (FINAL WORKING GRID VERSION)
*/

// 🔐 Protect page
requireAuth();

/* ============================================
   GLOBAL STATE
============================================ */
let allEmployees = [];

/* ============================================
   LOAD ALL EMPLOYEES (FIXED)
============================================ */
async function loadAll() {
  try {
    const token = localStorage.getItem("nexushr_idToken");

    const res = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      }
    });

    console.log("STATUS:", res.status);

    const raw = await res.json();
    console.log("DATA:", raw);

    const list = Array.isArray(raw.employees)
      ? raw.employees
      : (Array.isArray(raw) ? raw : []);

    // 🔥 FIX: connect API → UI
    allEmployees = list;
    renderCards(allEmployees);

  } catch (e) {
    console.error(e);

    document.getElementById("employeeGrid").innerHTML =
      `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load employees</h3>
      </div>`;
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

    loadAll(); // 🔥 refresh UI

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
    loadAll(); // 🔥 refresh UI

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

    loadAll(); // 🔥 refresh UI

  } catch (e) {
    console.error(e);
    showToast(e.message || "Error updating", "error");
  }
}

/* ============================================
   AUTO LOAD
============================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
});
