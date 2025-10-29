/* ==========================================
   LEGAL CASE MANAGEMENT DASHBOARD SCRIPT
   Works for: Head of Chamber, Lawyer, Principal
   ========================================== */

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar toggle for mobile view
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Sorting functionality
  const sortSelect = document.getElementById("sortSelect");
  const table = document.querySelector(".case-list table");
  const tbody = table ? table.querySelector("tbody") : null;

  if (sortSelect && tbody) {
    sortSelect.addEventListener("change", () => {
      const sortBy = sortSelect.value;
      sortTable(sortBy);
    });
  }

  function sortTable(criteria) {
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const getValue = (row, index) => row.cells[index]?.innerText.trim().toLowerCase();

    const columnIndexes = {
      adjournment: 4, // Adjournment Date column
      category: 1,    // Case Category column
      update: 3,      // Last Update column
      status: 2       // Case Status column
    };

    const colIndex = columnIndexes[criteria] || 0;

    rows.sort((a, b) => {
      const valA = getValue(a, colIndex);
      const valB = getValue(b, colIndex);

      // Handle date sorting
      if (criteria === "adjournment" || criteria === "update") {
        const dateA = new Date(valA);
        const dateB = new Date(valB);
        return dateA - dateB;
      }

      // Status sorting by priority
      if (criteria === "status") {
        const order = { ongoing: 1, "kept in view": 2, completed: 3 };
        return (order[valA] || 4) - (order[valB] || 4);
      }

      // Default alphabetical sorting
      return valA.localeCompare(valB);
    });

    // Reattach sorted rows
    tbody.innerHTML = "";
    rows.forEach(row => tbody.appendChild(row));
  }

  // Highlight active link in sidebar
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".sidebar-menu a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

  // Auto-sort by adjournment date (default)
  if (sortSelect) {
    sortSelect.value = "adjournment";
    sortTable("adjournment");
  }

  // Optional: Notification for upcoming adjournments
  const today = new Date();
  const notifyCases = [];
  if (tbody) {
    tbody.querySelectorAll("tr").forEach(row => {
      const adjDateText = row.cells[4]?.innerText.trim();
      if (adjDateText) {
        const adjDate = new Date(adjDateText);
        const diffDays = Math.ceil((adjDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          notifyCases.push({
            caseNo: row.cells[0]?.innerText.trim(),
            date: adjDateText,
            diff: diffDays
          });
        }
      }
    });
  }

  if (notifyCases.length > 0) {
    alert(
      "⚖️ Upcoming Adjournments:\n" +
        notifyCases
          .map(
            c =>
              `• Case ${c.caseNo}: ${c.date} (${c.diff} day${
                c.diff === 1 ? "" : "s"
              } left)`
          )
          .join("\n")
    );
  }

  console.log("Dashboard initialized successfully ✅");
});
