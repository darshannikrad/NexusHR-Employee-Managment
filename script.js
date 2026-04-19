/*
  script.js — NexusHR (FINAL WORKING)
*/

// 🔐 Protect page
requireAuth();

/* ============================================
   LOAD ALL EMPLOYEES (FIXED)
============================================ */
async function loadAll() {
  const tbody = document.getElementById("employeeTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  try {
    const token = localStorage.getItem("nexushr_idToken");
    console.log("TOKEN:", token);

    const res = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token   // 🔥 IMPORTANT (NO Bearer)
      }
    });

    console.log("STATUS:", res.status);

    const raw = await res.json();
    console.log("DATA:", raw);

    if (!res.ok) throw new Error("API Error");

    const list = Array.isArray(raw.employees)
      ? raw.employees
      : (Array.isArray(raw) ? raw : []);

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6">No employees found</td></tr>`;
      return;
    }

    list.forEach(emp => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${emp.name ?? "-"}</td>
        <td>${emp.email ?? "-"}</td>
        <td>${emp.role ?? "-"}</td>
        <td>${emp.department ?? "-"}</td>
        <td>${emp.photoUrl ? `<img src="${emp.photoUrl}" height="50">` : "-"}</td>
        <td>${emp.empID ?? "-"}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (e) {
    console.error("LOAD ERROR:", e);
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

  } catch (e) {
    console.error(e);
    showToast(e.message || "Failed to add", "error");
  }
}

/* ============================================
   DELETE EMPLOYEE
============================================ */
async function deleteEmployeeById() {
  const empID = document.getElementById("deleteEmpId")?.value?.trim();

  if (!empID) {
    showToast("Enter Employee ID", "error");
    return;
  }

  try {
    const token = localStorage.getItem("nexushr_idToken");

    const res = await fetch(API_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ empID })
    });

    if (!res.ok) throw new Error();

    showToast("Employee deleted", "success");

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
    showToast("Enter at least one field to update", "error");
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

    showToast(result.message || "Employee updated!", "success");

  } catch (e) {
    console.error(e);
    showToast(e.message || "Error updating employee", "error");
  }
}

/* ============================================
   AUTO LOAD (IMPORTANT)
============================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
});
