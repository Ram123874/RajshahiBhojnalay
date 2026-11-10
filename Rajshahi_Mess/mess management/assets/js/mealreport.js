// ========================================
// LIVE MEAL REPORT - RAJSHAHI BHOJNALAY
// Approved leave students are shown separately and excluded from meal-pending counts.
// ========================================
"use strict";

// This report is an admin page (also used inside the dashboard iframe).
if (localStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "index.html";
}

function getStoredData(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Storage error:", key, error);
        return [];
    }
}

const reportDate = document.getElementById("reportDate");
const reportMeal = document.getElementById("reportMeal");
const showMealReport = document.getElementById("showMealReport");
const totalStudentsElement = document.getElementById("totalStudents");
const mealTakenCountElement = document.getElementById("mealTakenCount");
const mealPendingCountElement = document.getElementById("mealPendingCount");
const mealLeaveCountElement = document.getElementById("mealLeaveCount");
const mealTakenList = document.getElementById("mealTakenList");
const mealPendingList = document.getElementById("mealPendingList");
const mealLeaveList = document.getElementById("mealLeaveList");
const mealStudentSearch = document.getElementById("mealStudentSearch");
const mealAllList = document.getElementById("mealAllList");
let currentReportGroups = { all: [], taken: [], pending: [], leave: [] };

function showMealList(type) {
    const sections = { all: "mealAllSection", taken: "mealTakenSection", pending: "mealPendingSection", leave: "mealLeaveSection" };
    Object.entries(sections).forEach(([key, id]) => {
        const section = document.getElementById(id);
        if (section) section.hidden = key !== type;
    });
    const target = document.getElementById(sections[type]);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeDate(value) {
    if (!value) return "";
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parts = text.split(/[-/]/);
    if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return text;
}

function escapeReportText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function isApprovedLeave(leave) {
    // Older direct-admin leave entries had no status; they are treated as approved.
    return !["pending", "rejected"].includes(String(leave.status || "approved").toLowerCase());
}

function leaveCoversMeal(leave, meal) {
    const type = String(leave.meal || "full").toLowerCase();
    return type === "full" || type === meal || !leave.meal;
}

function displayStudentList(container, students, emptyMessage, icon, detailFn) {
    if (!container) return;
    if (!students.length) {
        container.innerHTML = `<p>${escapeReportText(emptyMessage)}</p>`;
        return;
    }
    container.innerHTML = students.map(student => `
        <div class="meal-student-item">
            <span>${icon}</span>
            <strong>${escapeReportText(student.name || "नाव उपलब्ध नाही")}</strong>
            <small>ID: ${escapeReportText(student.id ?? "-")}</small>
            ${detailFn ? `<small>${escapeReportText(detailFn(student))}</small>` : ""}
        </div>
    `).join("");
}

// A student should appear only in the meal(s) they are registered for
// in the month containing the selected report date. This reads the same
// messtypeHistory structure used by the dashboard (YYYY-MM keys).
function getReportMessTypeForDate(student, date) {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(student.messtype || "M+E").trim().toUpperCase();
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    const history = student.messtypeHistory && typeof student.messtypeHistory === "object"
        ? student.messtypeHistory : {};
    return String(history[key] || student.messtype || "M+E").trim().toUpperCase();
}

function studentIsRegisteredForMeal(student, meal, date) {
    const messType = getReportMessTypeForDate(student, date);
    return meal === "morning"
        ? ["M", "M+E"].includes(messType)
        : ["E", "M+E"].includes(messType);
}

function generateMealReport() {
    const allStudents = getStoredData("students");
    const attendance = getStoredData("attendance");
    const leaves = getStoredData("studentLeaves");
    const selectedDate = normalizeDate(reportDate?.value || "");
    const selectedMeal = String(reportMeal?.value || "morning").trim().toLowerCase();
    const searchText = String(mealStudentSearch?.value || "").trim().toLowerCase();

    if (!selectedDate) {
        if (mealTakenList) mealTakenList.innerHTML = "<p>कृपया तारीख निवडा.</p>";
        return;
    }

    // Filter the population first: e.g. a Night-only student must never be
    // counted or listed in the Morning report's total/pending/taken/leave cards.
    const students = allStudents.filter(student =>
        studentIsRegisteredForMeal(student, selectedMeal, selectedDate)
    );

    const matchingAttendance = attendance.filter(record =>
        normalizeDate(record.date) === selectedDate &&
        String(record.meal || "").trim().toLowerCase() === selectedMeal
    );
    const takenIds = new Set(matchingAttendance.map(record => String(record.studentId ?? "").trim()).filter(Boolean));
    const takenNames = new Set(matchingAttendance.map(record => String(record.studentName || "").trim().toLowerCase()).filter(Boolean));

    const approvedLeaves = leaves.filter(leave =>
        normalizeDate(leave.date) === selectedDate &&
        isApprovedLeave(leave) &&
        leaveCoversMeal(leave, selectedMeal)
    );
    const leaveIds = new Set(approvedLeaves.map(leave => String(leave.studentId ?? "").trim()).filter(Boolean));

    const leaveStudents = [];
    const eligibleStudents = [];
    students.forEach(student => {
        const id = String(student.id ?? "").trim();
        const name = String(student.name || "").trim().toLowerCase();
        const matchingLeave = approvedLeaves.find(leave =>
            (id && String(leave.studentId ?? "").trim() === id) ||
            (!leave.studentId && name && String(leave.studentName || "").trim().toLowerCase() === name)
        );
        if (matchingLeave || (id && leaveIds.has(id))) {
            leaveStudents.push({
                ...student,
                leaveMeal: matchingLeave?.meal || "full",
                leaveReason: matchingLeave?.reason || "Approved leave"
            });
        } else {
            eligibleStudents.push(student);
        }
    });

    const takenStudents = [];
    const pendingStudents = [];
    eligibleStudents.forEach(student => {
        const id = String(student.id ?? "").trim();
        const name = String(student.name || "").trim().toLowerCase();
        const hasTakenMeal = (id && takenIds.has(id)) || (name && takenNames.has(name));
        (hasTakenMeal ? takenStudents : pendingStudents).push(student);
    });

    currentReportGroups = { all: students, taken: takenStudents, pending: pendingStudents, leave: leaveStudents };
    if (totalStudentsElement) totalStudentsElement.textContent = students.length;
    if (mealTakenCountElement) mealTakenCountElement.textContent = takenStudents.length;
    if (mealPendingCountElement) mealPendingCountElement.textContent = pendingStudents.length;
    if (mealLeaveCountElement) mealLeaveCountElement.textContent = leaveStudents.length;

    const matchesSearch = student =>
        String(student.name || "").toLowerCase().includes(searchText) ||
        String(student.id ?? "").toLowerCase().includes(searchText);

    displayStudentList(mealAllList, students.filter(matchesSearch), "विद्यार्थ्यांची नोंद उपलब्ध नाही.", "👤");
    displayStudentList(mealTakenList, takenStudents.filter(matchesSearch), "अद्याप जेवण केलेल्या विद्यार्थ्यांची नोंद नाही.", "✅");
    displayStudentList(mealPendingList, pendingStudents.filter(matchesSearch), "जेवण बाकी असलेले विद्यार्थी नाहीत.", "⏳");
    displayStudentList(
        mealLeaveList,
        leaveStudents.filter(matchesSearch),
        "या वेळेसाठी Approved Leave असलेले विद्यार्थी नाहीत.",
        "🏖️",
        student => `Leave: ${student.leaveMeal === "morning" ? "सकाळ" : student.leaveMeal === "night" ? "रात्र" : "पूर्ण दिवस"} · ${student.leaveReason}`
    );
}

document.querySelectorAll("[data-show-list]").forEach(card => {
    card.addEventListener("click", () => {
        const type = card.getAttribute("data-show-list");
        // Refresh counts and names using the currently selected date and meal before opening.
        generateMealReport();
        showMealList(type);
    });
});

if (showMealReport) showMealReport.addEventListener("click", generateMealReport);
if (reportMeal) reportMeal.addEventListener("change", generateMealReport);
if (reportDate) reportDate.addEventListener("change", generateMealReport);
if (mealStudentSearch) mealStudentSearch.addEventListener("input", () => {
    generateMealReport();
    const visible = Object.entries({all:"mealAllSection",taken:"mealTakenSection",pending:"mealPendingSection",leave:"mealLeaveSection"}).find(([,id]) => !document.getElementById(id)?.hidden);
    if (visible) showMealList(visible[0]);
});

// Update automatically when attendance or leave is changed in another open tab.
window.addEventListener("storage", event => {
    if (["students", "attendance", "studentLeaves"].includes(event.key)) generateMealReport();
});

if (reportDate) reportDate.value = getTodayDate();
generateMealReport();
