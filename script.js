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
async function loadEmployees() {
  const tbody = document.getElementById("employeeTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const BUCKET_URL = "https://employee-profile-yash-2026-project.s3.eu-north-1.amazonaws.com/";

  try {
    const res  = await authFetch(API_URL);
    const raw  = await res.json();

    const list = Array.isArray(raw.employees)
      ? raw.employees
      : (Array.isArray(raw) ? raw : []);

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6">No employees found</td></tr>`;
      return;
    }

    list.forEach(emp => {
      const imageUrl = emp.photoUrl
        ? BUCKET_URL + emp.photoUrl   // 🔥 ONLY FIX
        : null;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${emp.name ?? "-"}</td>
        <td>${emp.email ?? "-"}</td>
        <td>${emp.role ?? "-"}</td>
        <td>${emp.department ?? "-"}</td>
        <td>
          ${
            imageUrl
              ? `<img src="${imageUrl}" height="50" />`
              : "-"
          }
        </td>
        <td>${emp.empID ?? "-"}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="6">Error loading employees</td></tr>`;
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
