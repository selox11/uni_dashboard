const STORAGE_KEY = "universityApplications";

const applicationsGrid = document.getElementById("applicationsGrid");
const deadlineList = document.getElementById("deadlineList");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const applicationForm = document.getElementById("applicationForm");
const resetBtn = document.getElementById("resetBtn");
const statusMessage = document.getElementById("statusMessage");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const appliedCount = document.getElementById("appliedCount");
const acceptedCount = document.getElementById("acceptedCount");
const rejectedCount = document.getElementById("rejectedCount");
const completionText = document.getElementById("completionText");
const progressFill = document.getElementById("progressFill");

let applications = [];
let defaultApplications = [];
let activeFilter = "All";

async function init() {
  try {
    const response = await fetch("applications.json");

    if (!response.ok) {
      throw new Error("Could not load applications.json");
    }

    defaultApplications = await response.json();

    const saved = localStorage.getItem(STORAGE_KEY);
    applications = saved ? JSON.parse(saved) : [...defaultApplications];

    updateDashboard();
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Could not load application data.";
  }
}

function saveApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function updateDashboard() {
  renderStats();
  renderDeadlines();
  renderApplications();
}

function renderStats() {
  const counts = {
    total: applications.length,
    pending: applications.filter((app) => app.status === "Pending").length,
    applied: applications.filter((app) => app.status === "Applied").length,
    accepted: applications.filter((app) => app.status === "Accepted").length,
    rejected: applications.filter((app) => app.status === "Rejected").length,
  };

  totalCount.textContent = counts.total;
  pendingCount.textContent = counts.pending;
  appliedCount.textContent = counts.applied;
  acceptedCount.textContent = counts.accepted;
  rejectedCount.textContent = counts.rejected;

  const completed = counts.applied + counts.accepted + counts.rejected;
  const completion = counts.total === 0 ? 0 : Math.round((completed / counts.total) * 100);

  completionText.textContent = completion + "%";
  progressFill.style.width = completion + "%";
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getDaysClass(days) {
  if (days <= 7) return "urgent";
  if (days <= 21) return "upcoming";
  return "safe";
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function renderDeadlines() {
  const soonest = [...applications]
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  if (soonest.length === 0) {
    deadlineList.innerHTML = `<div class="deadline-item">No applications yet.</div>`;
    return;
  }

  deadlineList.innerHTML = soonest
    .map((app) => {
      const days = daysUntil(app.deadline);
      const chipClass = getDaysClass(days);
      const chipText = days < 0 ? "Deadline passed" : `${days} day(s) left`;

      return `
        <article class="deadline-item">
          <h4>${app.university}</h4>
          <p>${app.program}</p>
          <p>${formatDate(app.deadline)}</p>
          <span class="days-chip ${chipClass}">${chipText}</span>
        </article>
      `;
    })
    .join("");
}

function getFilteredApplications() {
  const query = searchInput.value.trim().toLowerCase();

  return applications.filter((app) => {
    const matchesFilter = activeFilter === "All" || app.status === activeFilter;
    const matchesQuery =
      query === "" ||
      app.university.toLowerCase().includes(query) ||
      app.program.toLowerCase().includes(query) ||
      app.country.toLowerCase().includes(query);

    return matchesFilter && matchesQuery;
  });
}

function renderApplications() {
  const filtered = getFilteredApplications();

  if (filtered.length === 0) {
    applicationsGrid.innerHTML = `
      <div class="empty-state">
        No applications match your current filter or search.
      </div>
    `;
    statusMessage.textContent = "0 applications shown";
    return;
  }

  applicationsGrid.innerHTML = filtered
    .map(
      (app) => `
      <article class="application-card">
        <div class="card-top">
          <div>
            <h3>${app.university}</h3>
            <p class="program">${app.program}</p>
          </div>
          <span class="badge ${app.status.toLowerCase()}">${app.status}</span>
        </div>

        <div class="meta">
          <div class="meta-row">
            <span>Country</span>
            <strong>${app.country}</strong>
          </div>
          <div class="meta-row">
            <span>Deadline</span>
            <strong>${formatDate(app.deadline)}</strong>
          </div>
        </div>

        <div class="card-actions">
          <label>
            Update status
            <select data-id="${app.id}" class="status-select">
              ${["Pending", "Applied", "Accepted", "Rejected"]
                .map(
                  (status) => `
                    <option value="${status}" ${status === app.status ? "selected" : ""}>
                      ${status}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
        </div>

        <div class="note-box">
          <strong>Notes:</strong> ${app.notes ? app.notes : "No notes yet."}
        </div>
      </article>
    `
    )
    .join("");

  statusMessage.textContent = `${filtered.length} application(s) shown`;

  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", handleStatusChange);
  });
}

function handleStatusChange(event) {
  const id = Number(event.target.dataset.id);
  const newStatus = event.target.value;

  applications = applications.map((app) => {
    if (app.id === id) {
      return { ...app, status: newStatus };
    }
    return app;
  });

  saveApplications();
  updateDashboard();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    renderApplications();
  });
});

searchInput.addEventListener("input", renderApplications);

applicationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newApplication = {
    id: Date.now(),
    university: document.getElementById("university").value.trim(),
    program: document.getElementById("program").value.trim(),
    country: document.getElementById("country").value.trim(),
    deadline: document.getElementById("deadline").value,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim(),
  };

  applications.unshift(newApplication);
  saveApplications();
  applicationForm.reset();
  document.getElementById("status").value = "Pending";
  updateDashboard();
});

resetBtn.addEventListener("click", () => {
  applications = [...defaultApplications];
  localStorage.removeItem(STORAGE_KEY);
  updateDashboard();
});

init();