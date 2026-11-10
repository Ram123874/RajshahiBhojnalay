// ========================================
// MESS MANAGEMENT DASHBOARD
// ========================================


// ========================================
// ADMIN LOGIN CHECK
// ========================================

if (localStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "index.html";
}


// ========================================
// DATA
// ========================================

let students =
    JSON.parse(localStorage.getItem("students")) || [];

// Keep student names in alphabetical order everywhere the dashboard uses this array.
function sortStudentsAlphabetically() {
    students.sort((a, b) => {
        const nameCompare = String(a.name || "").trim().localeCompare(
            String(b.name || "").trim(), "en", { sensitivity: "base", numeric: true }
        );
        if (nameCompare !== 0) return nameCompare;
        return String(a.id || "").localeCompare(String(b.id || ""), "en", { numeric: true });
    });
}

sortStudentsAlphabetically();

let attendance =
    JSON.parse(localStorage.getItem("attendance")) || [];
    
/* =====================================
   STUDENT LEAVE ATTENDANCE
===================================== */

// Leave data Local Storage मधून घ्या
let studentLeaves = JSON.parse(
    localStorage.getItem("studentLeaves") || "[]"
);

// Leave सेव्ह करा
function saveStudentLeaves() {
    localStorage.setItem(
        "studentLeaves",
        JSON.stringify(studentLeaves)
    );
}


// Populate the student selector in the leave application form.
function updateLeaveStudentOptions() {
    const select = document.getElementById("leaveStudentId");
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '<option value="">Select Student</option>';
    students.forEach(function (student) {
        const option = document.createElement("option");
        option.value = String(student.id);
        option.textContent = `${student.name} (ID: ${student.id})`;
        select.appendChild(option);
    });
    if (students.some(student => String(student.id) === previous)) select.value = previous;
}

function setupLeaveApplicationForm() {
    const form = document.getElementById("leaveApplicationForm");
    if (!form || form.dataset.ready === "true") return;
    form.dataset.ready = "true";
    const dateInput = document.getElementById("leaveDate");
    if (dateInput && !dateInput.value) {
        const now = new Date();
        dateInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    }
    updateLeaveStudentOptions();
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const studentId = document.getElementById("leaveStudentId").value;
        const date = document.getElementById("leaveDate").value;
        const meal = document.getElementById("leaveMealType").value;
        const reason = document.getElementById("leaveReason").value.trim();
        const student = students.find(item => String(item.id) === String(studentId));
        const message = document.getElementById("leaveApplicationMessage");
        if (!student || !date) {
            message.textContent = "कृपया विद्यार्थी आणि तारीख निवडा.";
            message.className = "leave-message error";
            return;
        }
        const meals = meal === "full" ? ["morning", "night"] : [meal];
        if (studentLeaves.some(item => String(item.studentId) === String(studentId) && item.date === date && (!item.meal || item.meal === "full" || meals.includes(item.meal)))) {
            message.textContent = "या विद्यार्थ्याची या तारखेसाठी Leave आधीच नोंदवली आहे.";
            message.className = "leave-message error";
            return;
        }
        if (attendance.some(record => String(record.studentId) === String(studentId) && record.date === date && meals.includes(record.meal))) {
            message.textContent = "या जेवणाची Attendance आधीच मार्क आहे. आधी Attendance unlock करा.";
            message.className = "leave-message error";
            return;
        }
        studentLeaves.push({ id: "leave-" + Date.now(), studentId: String(studentId), studentName: student.name, date: date, meal: meal, reason: reason, status: "approved", appliedAt: new Date().toISOString(), reviewedAt: new Date().toISOString() });
        saveStudentLeaves();
        if (typeof generateAttendance === "function") generateAttendance();
        if (typeof generateMonthlyReport === "function") generateMonthlyReport();
        message.textContent = `✅ ${student.name} यांची ${date} ची Leave नोंदवली गेली.`;
        message.className = "leave-message success";
        form.reset();
        dateInput.value = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;
        updateLeaveStudentOptions();
    });
}

// या विद्यार्थ्याला या तारखेला Leave आहे का?

function getStudentLeaveType(studentId, date, meal) {
    const leave = studentLeaves.find(function (item) {
        return String(item.studentId) === String(studentId) &&
               item.status !== "pending" && item.status !== "rejected" &&
               item.date === date &&
               (
                   !item.meal ||
                   item.meal === "full" ||
                   item.meal === meal
               );
    });

    return leave ? leave.meal || "full" : null;
}

function isStudentOnLeave(studentId, date, meal) {
    if (meal) {
        return Boolean(getStudentLeaveType(studentId, date, meal));
    }

    return studentLeaves.some(function (item) {
        return String(item.studentId) === String(studentId) &&
               item.status !== "pending" && item.status !== "rejected" &&
               item.date === date;
    });
}

function giveStudentLeave(studentId, date) {
    const student = students.find(function (item) {
        return String(item.id) === String(studentId);
    });

    if (!student) {
        alert("विद्यार्थी सापडला नाही.");
        return;
    }

    const choice = prompt(
        "Leave प्रकार निवडा:\n" +
        "1 = Morning Leave\n" +
        "2 = Night Leave\n" +
        "3 = Full Day Leave\n\n" +
        "1, 2 किंवा 3 टाका:"
    );

    if (choice === null) return;

    const leaveType = {
        "1": "morning",
        "2": "night",
        "3": "full"
    }[choice.trim()];

    if (!leaveType) {
        alert("कृपया 1, 2 किंवा 3 टाका.");
        return;
    }

    const meals = leaveType === "full"
        ? ["morning", "night"]
        : [leaveType];

    if (meals.some(function (meal) {
        return isStudentOnLeave(studentId, date, meal);
    })) {
        alert("या Leave प्रकारासाठी आधीच Leave आहे.");
        return;
    }

    const alreadyMarked = attendance.some(function (record) {
        return String(record.studentId) === String(studentId) &&
               record.date === date &&
               meals.includes(record.meal);
    });

    if (alreadyMarked) {
        alert("निवडलेल्या जेवणाची Attendance आधीच मार्क आहे. आधी Unlock करा.");
        return;
    }

    const labels = {
        morning: "Morning Leave",
        night: "Night Leave",
        full: "Full Day Leave"
    };

    if (!confirm(
        student.name + "\n" +
        date + "\n" +
        labels[leaveType] + "\n\n" +
        "Leave सेव्ह करायची का?"
    )) return;

    studentLeaves.push({
        id: "leave-" + Date.now(),
        studentId: String(studentId),
        studentName: student.name,
        date: date,
        meal: leaveType,
        status: "approved",
        appliedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString()
    });

    saveStudentLeaves();
    generateAttendance();
    generateMonthlyReport();

    alert("Leave सेव्ह झाली!");
}

function cancelStudentLeave(studentId, date) {
    const exists = studentLeaves.some(function (item) {
        return String(item.studentId) === String(studentId) &&
               item.date === date;
    });

    if (!exists) {
        alert("या दिवसाची Leave नाही.");
        return;
    }

    if (!confirm("या Leave ची नोंद रद्द करायची आहे का?")) return;

    studentLeaves = studentLeaves.filter(function (item) {
        return !(String(item.studentId) === String(studentId) &&
                 item.date === date);
    });

    saveStudentLeaves();
    generateAttendance();
    generateMonthlyReport();

    alert("Leave रद्द झाली.");
}


let mealHistory =
    JSON.parse(localStorage.getItem("mealHistory")) || [];

let payments =
    JSON.parse(localStorage.getItem("payments")) || [];

let mealRates =
    JSON.parse(localStorage.getItem("mealRates")) || {
        morning: 35,
        night: 35
    };


// ========================================
// STUDENT LEAVE REQUEST REVIEW
// ========================================
function renderLeaveRequests() {
    const container = document.getElementById("leaveRequestsList");
    if (!container) return;
    if (!studentLeaves.length) {
        container.innerHTML = '<p class="leave-empty">अजून Leave Request आलेली नाही.</p>';
        return;
    }
    const ordered = [...studentLeaves].sort((a,b) => {
        const rank = x => x.status === "pending" ? 0 : 1;
        return rank(a)-rank(b) || String(b.appliedAt || "").localeCompare(String(a.appliedAt || ""));
    });
    container.innerHTML = ordered.map((leave) => {
        const status = leave.status || "approved";
        const statusLabel = status === "pending" ? "Pending" : status === "rejected" ? "Rejected" : "Approved";
        const mealLabel = ({full:"Full Day", morning:"Morning", night:"Night"})[leave.meal] || "Full Day";
        const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
        // Student ID is the source of truth. Do not trust a stale/copied studentName
        // from an older leave record, as that can display another student's name.
        const linkedStudent = students.find(s => String(s.id ?? "").trim() === String(leave.studentId ?? "").trim());
        const displayName = linkedStudent ? linkedStudent.name : (leave.studentName || "Unlinked Student");
        const linkWarning = linkedStudent ? "" : '<p class="leave-link-warning">⚠️ Student ID विद्यार्थ्यांच्या यादीत सापडला नाही. कृपया ID तपासा.</p>';
        return `<article class="leave-request-card"><div class="leave-request-main"><strong>${safe(displayName)}</strong><span>ID: ${safe(leave.studentId)} · ${safe(leave.date)} · ${mealLabel}</span><p>${safe(leave.reason || "No reason provided")}</p>${linkWarning}</div><span class="leave-status ${status}">${statusLabel}</span><div class="leave-request-actions">${status === "pending" ? `<button type="button" class="leave-approve" onclick="reviewStudentLeaveById('${safe(leave.id)}', 'approved')">✓ Approve</button><button type="button" class="leave-reject" onclick="reviewStudentLeaveById('${safe(leave.id)}', 'rejected')">✕ Reject</button>` : `<button type="button" class="leave-reset" onclick="reviewStudentLeaveById('${safe(leave.id)}', 'pending')">Reset to Pending</button>`}</div></article>`;
    }).join("");
}
function clearAllStudentLeaves() {
    const count = studentLeaves.length;
    const status = document.getElementById("clearLeavesStatus");
    if (!count) {
        alert("Clear करण्यासाठी कोणतीही Leave नोंद नाही.");
        return;
    }

    const confirmed = confirm(`⚠️ तुम्ही ${count} Leave नोंदी Clear करणार आहात.\n\nही कृती Leave Requests आणि Student Leave History मधून सर्व नोंदी काढेल. Attendance आणि Payments बदलणार नाहीत.\n\nClear करण्यापूर्वी automatic backup तयार केला जाईल. पुढे जायचे आहे का?`);
    if (!confirmed) return;

    const typed = prompt('सुरक्षिततेसाठी खाली CLEAR असे टाइप करा. Cancel केल्यास काहीही delete होणार नाही.');
    if (typed !== "CLEAR") {
        if (status) status.textContent = "Clear रद्द केले. कोणतीही Leave delete केलेली नाही.";
        return;
    }

    try {
        // Keep a recoverable snapshot before deleting any leave records.
        localStorage.setItem("studentLeavesClearBackup", JSON.stringify({
            backedUpAt: new Date().toISOString(),
            count,
            leaves: studentLeaves
        }));
        studentLeaves = [];
        saveStudentLeaves();
        renderLeaveRequests();
        if (status) status.textContent = `✅ ${count} Leave नोंदी Clear झाल्या. सुरक्षित backup browser LocalStorage मध्ये studentLeavesClearBackup नावाने जतन केला आहे.`;
        if (typeof generateAttendance === "function") generateAttendance();
        if (typeof generateMonthlyReport === "function") generateMonthlyReport();
        alert(`${count} Leave नोंदी Clear झाल्या. Backup सुरक्षितपणे जतन केला आहे.`);
    } catch (error) {
        if (status) status.textContent = "Leave Clear करता आली नाही. Browser storage उपलब्ध आहे का ते तपासा.";
        alert("Leave Clear करता आली नाही. Browser storage भरलेले किंवा unavailable असू शकते.");
    }
}

function reviewStudentLeaveById(leaveId, status) {
    const leave = studentLeaves.find(item => String(item.id) === String(leaveId));
    if (!leave) { alert("Leave नोंद सापडली नाही. पेज Refresh करा."); return; }
    const label = status === "approved" ? "approve" : status === "rejected" ? "reject" : "reset";
    if (!confirm(`ही Leave ${label} करायची आहे का?`)) return;
    leave.status = status;
    leave.reviewedAt = status === "pending" ? null : new Date().toISOString();
    saveStudentLeaves();
    renderLeaveRequests();
    if (typeof generateAttendance === "function") generateAttendance();
    if (typeof generateMonthlyReport === "function") generateMonthlyReport();
}

function reviewStudentLeave(index, status) {
    const leave = studentLeaves[index];
    if (!leave) return;
    const label = status === "approved" ? "approve" : status === "rejected" ? "reject" : "reset";
    if (!confirm(`ही Leave ${label} करायची आहे का?`)) return;
    leave.status = status;
    leave.reviewedAt = status === "pending" ? null : new Date().toISOString();
    saveStudentLeaves();
    renderLeaveRequests();
    if (typeof generateAttendance === "function") generateAttendance();
    if (typeof generateMonthlyReport === "function") generateMonthlyReport();
}

// ========================================
// MONTHS / DATE
// ========================================

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const currentDate = new Date();
let currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth();


// ========================================
// STORAGE FUNCTIONS
// ========================================

function saveStudents() {
    sortStudentsAlphabetically();
    localStorage.setItem(
        "students",
        JSON.stringify(students)
    );
}

function saveAttendance() {
    localStorage.setItem(
        "attendance",
        JSON.stringify(attendance)
    );
}

function saveMealHistory() {
    localStorage.setItem(
        "mealHistory",
        JSON.stringify(mealHistory)
    );
}

function savePayments() {
    localStorage.setItem(
        "payments",
        JSON.stringify(payments)
    );
}

function saveMealRates() {
    localStorage.setItem(
        "mealRates",
        JSON.stringify(mealRates)
    );
}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ========================================
// ESCAPE JAVASCRIPT
// ========================================

function escapeJs(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}


// ========================================
// MONTH SELECTOR
// ========================================

function setupMonthSelector() {

    const selector = document.getElementById("monthSelector");
    const yearSelector = document.getElementById("yearSelector");

    // Restore the last selected month/year so searching October and then
    // switching to November always displays and saves against the chosen month.
    const savedMonth = localStorage.getItem("messSelectedMonth");
    const savedYear = localStorage.getItem("messSelectedYear");

    if (selector) {
        selector.value = savedMonth !== null && Number(savedMonth) >= 0 && Number(savedMonth) <= 11
            ? savedMonth
            : String(currentMonth);
        selector.addEventListener("change", function () {
            localStorage.setItem("messSelectedMonth", selector.value);
            generateAttendance();
            generateMonthlyReport();
        });
    }

    // Year selection from 2026 through 2050
    if (yearSelector) {
        yearSelector.innerHTML = "";
        for (let year = 2026; year <= 2050; year++) {
            const option = document.createElement("option");
            option.value = String(year);
            option.textContent = String(year);
            yearSelector.appendChild(option);
        }

        const defaultYear = Math.min(2050, Math.max(2026, currentDate.getFullYear()));
        const initialYear = savedYear !== null && Number(savedYear) >= 2026 && Number(savedYear) <= 2050
            ? Number(savedYear)
            : defaultYear;
        yearSelector.value = String(initialYear);
        currentYear = initialYear;

        yearSelector.addEventListener("change", function () {
            currentYear = Number(yearSelector.value);
            localStorage.setItem("messSelectedYear", String(currentYear));
            generateAttendance();
            generateMonthlyReport();
        });
        localStorage.setItem("messSelectedMonth", selector ? selector.value : String(currentMonth));
        localStorage.setItem("messSelectedYear", String(currentYear));
    }
}


// Get the mess type applicable to a particular month. Older students without
// history continue to use their existing mess type.
function getStudentMessTypeForPeriod(student, year = currentYear, month = Number(document.getElementById("monthSelector")?.value ?? currentMonth)) {
    const key = `${year}-${String(Number(month) + 1).padStart(2, "0")}`;
    const history = student && student.messtypeHistory && typeof student.messtypeHistory === "object"
        ? student.messtypeHistory : {};
    return String(history[key] || student.messtype || "M+E").trim().toUpperCase();
}

// ========================================
// MONTH TITLE
// ========================================

function updateMonthTitle() {

    const selector =
        document.getElementById("monthSelector");

    const title =
        document.getElementById("monthTitle");

    if (!selector || !title) {
        return;
    }

    const month =
        Number(selector.value);

    title.textContent =
        months[month] + " " + currentYear;
}


// ========================================
// ADD STUDENT
// ========================================

function setupStudentForm() {

    const studentForm =
        document.getElementById("studentForm");

    if (!studentForm) {
        return;
    }

    const joinDateInput = document.getElementById("join-date");
    if (joinDateInput && !joinDateInput.value) {
        joinDateInput.value = new Date().toISOString().slice(0, 10);
    }

    studentForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const name =
                document
                    .getElementById("studentName")
                    .value
                    .trim();

            const id =
                document
                    .getElementById("student-m-Number")
                    .value
                    .trim();

            const room =
                document
                    .getElementById("allocated-table")
                    .value
                    .trim();
            const joinDate = document.getElementById("join-date").value;
            const messtype = document
                    .getElementById("messtype")
                    .value
                    .trim()
                     .toUpperCase();

if (!["M", "E", "M+E"].includes(messtype)) {
    alert("Mess Type मध्ये M, E किंवा M+E टाका.");
    return;
}        
                    

            if (!name || !id) {
                alert("Student Name आणि Student ID आवश्यक आहे.");
                return;
            }
            if (!joinDate) {
                alert("कृपया Student Join Date निवडा.");
                return;
            }

            const exists =
                students.some(
                    function (student) {
                        return student.id === id;
                    }
                );

            if (exists) {

                alert(
                    "हा Student ID आधीच आहे."
                );

                return;
            }

            students.push({
                id: id,
                name: name,
                room: room,
                joinDate: joinDate,
                messtype: messtype
            });

            saveStudents();

            studentForm.reset();

            displayStudents();
            generateAttendance();
            generateMonthlyReport();

            alert(
                "Student Successfully Added ✅"
            );

        }
    );
}


// ========================================
// STUDENT LIST SEARCH
// ========================================

function setupStudentsListSearch() {

    const list =
        document.getElementById("studentList");

    if (!list) {
        return;
    }

    let searchInput =
        document.getElementById(
            "studentsListSearch"
        );

    if (!searchInput) {

        const wrapper =
            document.createElement("div");

        wrapper.style.marginBottom =
            "15px";

        wrapper.innerHTML = `
            <input
                type="text"
                id="studentsListSearch"
                placeholder="🔎 Student Name / ID Search..."
                autocomplete="off"
                style="
                    width:100%;
                    max-width:400px;
                    height:45px;
                    padding:10px 15px;
                    box-sizing:border-box;
                    border:1px solid #ccc;
                    border-radius:10px;
                    font-size:16px;
                    outline:none;
                "
            >
        `;

        list.parentNode.insertBefore(
            wrapper,
            list
        );

        searchInput =
            document.getElementById(
                "studentsListSearch"
            );
    }

    if (
        searchInput.dataset.ready ===
        "true"
    ) {
        return;
    }

    searchInput.dataset.ready = "true";

    searchInput.addEventListener(
        "input",
        function () {
            displayStudents();
        }
    );
}


// ========================================
// DISPLAY STUDENTS
// ========================================

function displayStudents() {

    setupStudentsListSearch();
    setupLeaveApplicationForm();
    updateLeaveStudentOptions();
    renderLeaveRequests();

    const list = document.getElementById("studentList");

    if (!list) return;

    list.innerHTML = "";

    if (students.length === 0) {
        list.innerHTML = `<p>No students added yet.</p>`;
        return;
    }

    const searchInput = document.getElementById("studentsListSearch");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const filteredStudents = students.filter(function (student) {

        const name = String(student.name || "").toLowerCase();
        const id = String(student.id || "").toLowerCase();

        return name.includes(searchText) || id.includes(searchText);
    });

    if (filteredStudents.length === 0) {
        list.innerHTML = `
            <p style="text-align:center;padding:20px;">
                🔎 Student सापडला नाही.
            </p>
        `;
        return;
    }

    filteredStudents.forEach(function (student) {

        const div = document.createElement("div");
        div.className = "student-item";

        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.gap = "12px";
        div.style.flexWrap = "wrap";

        const messType = getStudentMessTypeForPeriod(student).toUpperCase();

        const messLabel = {
            "M": "🌅 Morning Mess",
            "E": "🌙 Evening/Night Mess",
            "M+E": "🍽️ Morning + Evening Mess"
        };

        div.innerHTML = `
            <div style="flex:1;min-width:180px;">
                <b>${escapeHtml(student.name)}</b>

                <span style="display:block;margin-top:5px;">
                    ID: ${escapeHtml(student.id)}
                    | Room: ${escapeHtml(student.room || "-")}
                    <br>📅 Join Date: ${escapeHtml(student.joinDate || "Not Set")}
                </span>

                <span style="
                    display:block;
                    margin-top:5px;
                    color:#15803d;
                    font-weight:bold;
                ">
                    ${escapeHtml(messLabel[messType] || "🍽️ Mess Type: Not Set")}
                </span>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button
                    type="button"
                    onclick="editStudentById('${escapeJs(student.id)}')"
                    style="background:#2563eb;color:white;padding:8px 12px;border:0;border-radius:6px;cursor:pointer;"
                >
                    ✏️ EDIT/UPDATE
                </button>

                <button
                    type="button"
                    onclick="deleteStudentById('${escapeJs(student.id)}')"
                    style="background:red;color:white;padding:8px 12px;border:0;border-radius:6px;cursor:pointer;"
                >
                    Delete
                </button>
            </div>
        `;

        list.appendChild(div);
    });
}


function editStudentById(studentId) {

    const student = students.find(
        item => String(item.id) === String(studentId)
    );

    if (!student) {
        alert("Student सापडला नाही!");
        return;
    }

    const newName = prompt(
        "विद्यार्थ्याचे नवीन नाव:",
        student.name
    );

    if (newName === null || !newName.trim()) {
        return;
    }

    const newId = prompt(
        "विद्यार्थ्याचा नवीन ID:",
        student.id
    );

    if (newId === null || !newId.trim()) {
        return;
    }

    const newRoom = prompt(
        "नवीन Room Number:",
        student.room || ""
    );

    if (newRoom === null) {
        return;
    }

    const newJoinDate = prompt(
        "विद्यार्थ्याची Join Date (YYYY-MM-DD):",
        student.joinDate || new Date().toISOString().slice(0, 10)
    );
    if (newJoinDate === null || !/^\d{4}-\d{2}-\d{2}$/.test(newJoinDate.trim())) {
        if (newJoinDate !== null) alert("कृपया तारीख YYYY-MM-DD या format मध्ये टाका.");
        return;
    }

    // Existing Mess Type
    const selectedMonth = Number(document.getElementById("monthSelector")?.value ?? currentMonth);
    const selectedYear = Number(document.getElementById("yearSelector")?.value ?? currentYear);
    const currentMessType = getStudentMessTypeForPeriod(student, selectedYear, selectedMonth);

    const newMessType = prompt(
        "Mess Type निवडा:\nM = Morning\nE = Evening/Night\nM+E = Morning + Evening",
        currentMessType
    );

    if (newMessType === null) {
        return;
    }

    const cleanMessType = newMessType
        .trim()
        .toUpperCase();

    if (!["M", "E", "M+E"].includes(cleanMessType)) {
        alert("❌ कृपया M, E किंवा M+E टाका.");
        return;
    }

    const cleanId = newId.trim();

    const duplicate = students.some(
        item =>
            String(item.id) === cleanId &&
            String(item.id) !== String(studentId)
    );

    if (duplicate) {
        alert("हा Student ID आधीपासून उपलब्ध आहे!");
        return;
    }

    // Update student details
    student.name = newName.trim();
    student.id = cleanId;
    student.room = newRoom.trim();
    student.joinDate = newJoinDate.trim();
    // Mess type changes apply only to the selected month/year, not every month.
    if (!student.messtypeHistory || typeof student.messtypeHistory !== "object") student.messtypeHistory = {};
    const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    student.messtypeHistory[periodKey] = cleanMessType;

    // Save to Local Storage
    saveStudents();

    // Refresh dashboard
    displayStudents();
    generateAttendance();
    generateMonthlyReport();

    alert(
        "✅ Student Details Updated Successfully!\n\n" +
        "Name: " + student.name +
        "\nID: " + student.id +
        "\nRoom: " + student.room +
        "\nJoin Date: " + student.joinDate +
        "\nMess Type for " + months[selectedMonth] + " " + selectedYear + ": " + cleanMessType
    );
}


// ========================================
// DELETE STUDENT
// ========================================

function deleteStudentById(studentId) {

    const index =
        students.findIndex(
            function (student) {
                return student.id === studentId;
            }
        );

    if (index === -1) {
        return;
    }

    const student =
        students[index];

    const confirmed =
        confirm(
            "हा Student delete करायचा आहे का?\n\n" +
            student.name
        );

    if (!confirmed) {
        return;
    }

    students.splice(index, 1);

    saveStudents();

    displayStudents();
    generateAttendance();
    generateMonthlyReport();
}


// ========================================
// MONTHLY ATTENDANCE SEARCH
// ========================================

function setupAttendanceSearch() {

    const searchInput =
        document.getElementById(
            "studentSearch"
        );

    if (!searchInput) {
        return;
    }

    if (
        searchInput.dataset.ready ===
        "true"
    ) {
        return;
    }

    searchInput.dataset.ready = "true";

    searchInput.addEventListener(
        "input",
        function () {
            generateAttendance();
        }
    );
}


// ========================================
// GENERATE ATTENDANCE
// ========================================


function generateAttendance() {
    const selector = document.getElementById("monthSelector");
    const head = document.getElementById("attendanceHead");
    const body = document.getElementById("attendanceBody");

    if (!selector || !head || !body) return;

    const month = Number(selector.value);
    updateMonthTitle();

    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();

    head.innerHTML = "";
    body.innerHTML = "";

    let header = `<tr><th class="name-column">Student Name</th>`;

    for (let day = 1; day <= daysInMonth; day++) {
        header += `<th>${day}</th>`;
    }

    head.innerHTML = header + `</tr>`;

    const searchInput = document.getElementById("studentSearch");
    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const filteredStudents = students.filter(function (student) {
        return String(student.name || "").toLowerCase().includes(searchText) ||
               String(student.id || "").toLowerCase().includes(searchText);
    });

    if (filteredStudents.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="${daysInMonth + 1}" style="text-align:center;padding:12px;color:black">
                    🔎 Student सापडला नाही.
                </td>
            </tr>`;
        return;
    }

    filteredStudents.forEach(function (student) {
        let row = `
            <tr>
                <td class="name-column">
                    <strong>${escapeHtml(student.name)}</strong><br>
                    <small>ID: ${escapeHtml(student.id)}</small><br>
                    ${(() => {
                        const type = getStudentMessTypeForPeriod(student, currentYear, month);
                        const labels = [];
                        if (["M", "M+E"].includes(type)) labels.push('<small style="color:green">🌅 Morning Mess</small>');
                        if (["E", "M+E"].includes(type)) labels.push('<small style="color:blue">🌃 Night Mess</small>');
                        return labels.join("<br>");
                    })()}
                </td>`;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = currentYear + "-" +
                String(month + 1).padStart(2, "0") + "-" +
                String(day).padStart(2, "0");

            // प्रत्येक meal ची leave स्वतंत्रपणे तपासा.
            // Morning leave असल्यास Night meal वर परिणाम होऊ नये.
            const morningLeave = isStudentOnLeave(student.id, date, "morning");
            const nightLeave = isStudentOnLeave(student.id, date, "night");
            const anyLeave = morningLeave || nightLeave;
            const morningLocked = attendance.some(function (record) {
    return String(record.studentId) === String(student.id) &&
           record.date === date &&
           record.meal === "morning" &&
           record.locked === true;
});

const nightLocked = attendance.some(function (record) {
    return String(record.studentId) === String(student.id) &&
           record.date === date &&
           record.meal === "night" &&
           record.locked === true;
});

            row += `<td ><div class="meal-buttons">`;


            // MORNING ATTENDANCE
if (morningLeave) {
    row += `
        <button class="meal-btn leave-btn" disabled>
            🌅 Leave
        </button>`;
} else if (morningLocked) {
    row += `
        <button class="meal-btn"
            style="background:#16a34a;color:white;"
            onclick="unlockAttendance('${escapeJs(student.id)}','${date}','morning')"
            title="Locked - Click to Unlock">
            ✅
        </button>`;
} else {
    row += `
        <button class="meal-btn morning-btn"
            onclick="markAttendance('${escapeJs(student.id)}','${date}','morning')"
            title="Morning Meal">
            🌅
        </button>`;
}

// NIGHT ATTENDANCE
if (nightLeave) {
    row += `
        <button class="meal-btn leave-btn" disabled>
            🌃 Leave
        </button>`;
} else if (nightLocked) {
    row += `
        <button class="meal-btn"
            style="background:#16a34a;color:white;"
            onclick="unlockAttendance('${escapeJs(student.id)}','${date}','night')"
            title="Locked - Click to Unlock">
            ✅
        </button>`;
} else {
    row += `
        <button class="meal-btn night-btn"
            onclick="markAttendance('${escapeJs(student.id)}','${date}','night')"
            title="Night Meal">
            🌃
        </button>`;
}

            if (anyLeave) {
                row += `
                    <button class="leave-action-btn"
                        onclick="cancelStudentLeave('${escapeJs(student.id)}','${date}')">
                        Cancel Leave
                    </button>`;
            }

            row += `</div></td>`;
        }

        row += `</tr>`;
        body.innerHTML += row;
    });
}


// ========================================
// MARK ATTENDANCE
// ========================================


function markAttendance(
    studentId,
    date,
    meal
) {
    

if (isStudentOnLeave(studentId, date, meal)) {
    alert("या जेवणासाठी विद्यार्थ्याला Leave आहे.");
    return;
}


    const student =
        students.find(
            function (item) {
                return item.id === studentId;
            }
        );

    if (!student) {
        return;
    }

    const alreadyMarked =
        attendance.some(
            function (record) {

                return (
                    record.studentId === studentId &&
                    record.date === date &&
                    record.meal === meal
                );
            }
        );

    if (alreadyMarked) {

        alert(
            "ही attendance आधीच marked आहे."
        );

        return;
    }

    const mealName =
        meal === "morning"
            ? "🌅 Morning"
            : "🌃 Night";

    const confirmed =
        confirm(
            "Are you confirmed?\n\n" +
            "👤 Student: " +
            student.name +
            "\n🍽️ Meal: " +
            mealName +
            "\n📅 Date: " +
            date +
            "\n\n" +
            "Confirm केल्यावर attendance LOCK होईल."
        );

    if (!confirmed) {
        return;
    }

    const now =
        new Date();

    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    attendance.push({

        studentId:
            studentId,

        studentName:
            student.name,

        date:
            date,

        meal:
            meal,

        time:
            time,

        locked:
            true
    });

    saveAttendance();

    mealHistory.push({

        studentId:
            studentId,

        studentName:
            student.name,

        date:
            date,

        meal:
            meal,

        time:
            time
    });

    saveMealHistory();

    generateAttendance();
    displayHistory();
    generateMonthlyReport();

    showAttendanceConfirmation(
        student.name,
        mealName,
        date,
        time
    );
}


// ========================================
// ATTENDANCE CONFIRMATION
// ========================================

function showAttendanceConfirmation(
    studentName,
    mealName,
    date,
    time
) {

    const old =
        document.getElementById(
            "attendanceConfirmation"
        );

    if (old) {
        old.remove();
    }

    const box =
        document.createElement("div");

    box.id =
        "attendanceConfirmation";

    box.innerHTML = `
        <div class="confirmation-icon">
            ✅
        </div>

        <div>

            <strong>
                Attendance Confirmed
            </strong>

            <p>

                👤 ${escapeHtml(studentName)}
                <br>

                🍽️ ${escapeHtml(mealName)}
                <br>

                📅 ${escapeHtml(date)}
                <br>

                🕐 ${escapeHtml(time)}
                <br>

                🔒 <b>Locked</b>

            </p>

        </div>
    `;

    document.body.appendChild(box);

    setTimeout(
        function () {

            box.classList.add("hide");

            setTimeout(
                function () {
                    box.remove();
                },
                300
            );

        },
        3000
    );
}


// ========================================
// UNLOCK ATTENDANCE
// ========================================

function unlockAttendance(
    studentId,
    date,
    meal
) {

    const student =
        students.find(
            function (item) {
                return item.id === studentId;
            }
        );

    if (!student) {

        alert(
            "❌ Student सापडला नाही."
        );

        return;
    }

    const username =
        prompt(
            "🔐 Admin Username:"
        );

    if (username !== "admin") {

        alert(
            "❌ Wrong Admin Username"
        );

        return;
    }

    const password =
        prompt(
            "🔐 Admin Password:"
        );

    if (password !== "admin123") {

        alert(
            "❌ Wrong Admin Password"
        );

        return;
    }

    const mealName =
        meal === "morning"
            ? "🌅 Morning"
            : "🌃 Night";

    const confirmed =
        confirm(
            "⚠️ Attendance Unlock करायचे आहे का?\n\n" +
            "👤 Student: " +
            student.name +
            "\n🍽️ Meal: " +
            mealName +
            "\n📅 Date: " +
            date +
            "\n\n" +
            "Unlock केल्यावर पुन्हा attendance mark करता येईल."
        );

    if (!confirmed) {
        return;
    }

    attendance =
        attendance.filter(
            function (record) {

                return !(
                    record.studentId === studentId &&
                    record.date === date &&
                    record.meal === meal
                );
            }
        );

    saveAttendance();

    mealHistory =
        mealHistory.filter(
            function (record) {

                return !(
                    record.studentId === studentId &&
                    record.date === date &&
                    record.meal === meal
                );
            }
        );

    saveMealHistory();

    generateAttendance();
    displayHistory();
    generateMonthlyReport();

    alert(
        "🔓 Attendance Successfully Unlocked!"
    );
}


// ========================================
// DISPLAY MEAL HISTORY
// ========================================

function displayHistory() {

    const history =
        document.getElementById(
            "history"
        );

    const historyList =
        document.getElementById(
            "mealHistoryList"
        );

    const container =
        history || historyList;

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (mealHistory.length === 0) {

        container.innerHTML =
            "<p>Meal History Empty.</p>";

        return;
    }

    mealHistory
        .slice()
        .reverse()
        .forEach(
            function (record) {

                const icon =
                    record.meal === "morning"
                        ? "🌅"
                        : "🌃";

                const text =
                    record.meal === "morning"
                        ? "सकाळ"
                        : "रात्री";

                const div =
                    document.createElement(
                        "div"
                    );

                div.className =
                    "history-item";

                div.innerHTML = `
                    <b>
                        ${escapeHtml(
                            record.studentName
                        )}
                    </b>

                    <br>

                    ${icon}
                    ${text}

                    <br>

                    📅
                    ${escapeHtml(
                        record.date
                    )}

                    <br>

                    🕐
                    ${escapeHtml(
                        record.time
                    )}
                `;

                container.appendChild(div);
            }
        );
}


// ========================================
// CLEAR HISTORY
// ========================================

function clearMealHistory() {

    const username =
        prompt(
            "🔐 Admin Username टाका:"
        );

    if (username !== "admin") {

        alert(
            "❌ Wrong Admin Username"
        );

        return;
    }

    const password =
        prompt(
            "🔐 Admin Password टाका:"
        );

    if (password !== "admin123") {

        alert(
            "❌ Wrong Admin Password"
        );

        return;
    }

    const confirmed =
        confirm(
            "⚠️ WARNING!\n\n" +
            "Meal History clear होईल.\n" +
            "Meal Attendance clear होईल.\n" +
            "सर्व Attendance Locks हटतील.\n" +
            "सर्व Payment Records सुद्धा clear होतील.\n\n" +
            "Students आणि Meal Rates तसेच राहतील.\n\n" +
            "तुम्हाला खात्री आहे का?"
        );

    if (!confirmed) {
        return;
    }

    mealHistory = [];
    attendance = [];
    payments = [];

    saveMealHistory();
    saveAttendance();
    savePayments();

    displayHistory();
    generateAttendance();
    generateMonthlyReport();

    alert(
        "✅ Meal History, Attendance आणि Payment Records Clear झाले."
    );
}


// ========================================
// MEAL RATES
// ========================================

function loadMealRates() {

    const morning =
        document.getElementById(
            "morningRate"
        );

    const night =
        document.getElementById(
            "nightRate"
        );

    if (morning) {
        morning.value =
            mealRates.morning;
    }

    if (night) {
        night.value =
            mealRates.night;
    }
}


function setupMealRateButton() {

    const button =
        document.getElementById(
            "saveRatesButton"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        saveMealRatesFromInputs
    );
}


function saveMealRatesFromInputs() {

    const morningInput =
        document.getElementById(
            "morningRate"
        );

    const nightInput =
        document.getElementById(
            "nightRate"
        );

    if (!morningInput || !nightInput) {
        return;
    }

    const morning =
        Number(morningInput.value);

    const night =
        Number(nightInput.value);

    if (
        isNaN(morning) ||
        isNaN(night) ||
        morning < 0 ||
        night < 0
    ) {

        alert(
            "Rate चुकीचा आहे."
        );

        return;
    }

    mealRates = {
        morning: morning,
        night: night
    };

    saveMealRates();

    generateMonthlyReport();

    alert(
        "Meal Rates Saved ✅"
    );
}


// ========================================
// MONTHLY FINAL REPORT
// ========================================


function generateMonthlyReport() {
    const selector = document.getElementById("monthSelector");
    const reportBody = document.getElementById("reportBody");
    if (!selector || !reportBody) return;

    const month = Number(selector.value);
    const year = currentYear;
    const reportMonth = document.getElementById("reportMonth");
    if (reportMonth) reportMonth.textContent = months[month] + " " + year;
    reportBody.innerHTML = "";

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monthly client rates: one meal (M or E) = ₹1,300; both (M+E) = ₹2,400.
    const singleMealMonthlyRate = 1300;
    const bothMealsMonthlyRate = 2400;
    // Leave deduction is the configured per-meal rate (default ₹35),
    // not the monthly fee divided by calendar days.
    const morningDailyRate = Number(mealRates?.morning ?? 35);
    const nightDailyRate = Number(mealRates?.night ?? 35);

    students.forEach(function (student) {
        const studentId = String(student.id);
        const messType = getStudentMessTypeForPeriod(student, year, month);
        const hasMorning = ["M", "M+E"].includes(messType);
        const hasNight = ["E", "M+E"].includes(messType);

        const morningCount = attendance.filter(record => String(record.studentId) === studentId && record.meal === "morning" && getMonth(record.date) === month && getYear(record.date) === year).length;
        const nightCount = attendance.filter(record => String(record.studentId) === studentId && record.meal === "night" && getMonth(record.date) === month && getYear(record.date) === year).length;

        const monthLeaves = studentLeaves.filter(leave => String(leave.studentId) === studentId && leave.status !== "pending" && leave.status !== "rejected" && getMonth(leave.date) === month && getYear(leave.date) === year);
        const morningLeaveDates = new Set();
        const nightLeaveDates = new Set();
        monthLeaves.forEach(function (leave) {
            // Legacy leave records without meal are treated as full-day leave.
            if (!leave.meal || leave.meal === "full" || leave.meal === "morning") morningLeaveDates.add(leave.date);
            if (!leave.meal || leave.meal === "full" || leave.meal === "night") nightLeaveDates.add(leave.date);
        });
        const morningLeaveDays = hasMorning ? morningLeaveDates.size : 0;
        const nightLeaveDays = hasNight ? nightLeaveDates.size : 0;
        const leaveDays = new Set([...morningLeaveDates, ...nightLeaveDates]).size;
        const totalMeals = morningCount + nightCount;

        const monthlyBaseBill = messType === "M+E" ? bothMealsMonthlyRate : (hasMorning || hasNight ? singleMealMonthlyRate : 0);
        // Morning leave deducts only the morning rate; night leave only night rate.
        // Full-day leave is counted once in each set, so deducts both rates.
        const leaveDeduction = (morningLeaveDays * morningDailyRate) + (nightLeaveDays * nightDailyRate);
        const finalBill = Math.max(0, monthlyBaseBill - leaveDeduction);
        const paidAmount = payments.filter(payment => String(payment.studentId) === studentId && Number(payment.month) === month && Number(payment.year) === year)
            .reduce((total, payment) => total + Number(payment.amount || 0), 0);
        const remaining = finalBill - paidAmount;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><b>${escapeHtml(student.name)}</b><br><small>${escapeHtml(messType)}</small></td>
            <td>${morningCount}</td>
            <td>${nightCount}</td>
            <td>${leaveDays} <small>(🌅 ${morningLeaveDays} / 🌃 ${nightLeaveDays})</small></td>
            <td><b>${totalMeals}</b></td>
            <td>₹${monthlyBaseBill.toFixed(2)}</td>
            <td>₹${leaveDeduction.toFixed(2)}</td>
            <td><b>₹${finalBill.toFixed(2)}</b></td>
            <td>₹${paidAmount.toFixed(2)}</td>
            <td class="${remaining > 0 ? "remaining" : "paid"}">₹${remaining.toFixed(2)}</td>
            <td><div class="payment-actions"><button class="payment-btn" onclick="addPayment('${escapeJs(student.id)}')">💰 Add Payment</button><button class="edit-payment-btn" onclick="editPayment('${escapeJs(student.id)}')">✏️ Edit Payment</button></div></td>
            <td><button class="details-btn" onclick="showStudentReport('${escapeJs(student.id)}')">👁️ Details</button></td>`;
        reportBody.appendChild(row);
    });
}


// ========================================
// GET MONTH
// ========================================

function getMonth(dateString) {

    const parts =
        String(dateString).split("-");

    return (
        Number(parts[1]) - 1
    );
}


// ========================================
// GET YEAR
// ========================================

function getYear(dateString) {

    const parts =
        String(dateString).split("-");

    return Number(parts[0]);
}


// ========================================
// ADD PAYMENT
// ========================================

function addPayment(studentId) {

    const student =
        students.find(
            function (item) {
                return item.id === studentId;
            }
        );

    if (!student) {

        alert(
            "Student not found."
        );

        return;
    }

    const amountText =
        prompt(
            "💰 " +
            student.name +
            "\n\n" +
            "किती रुपये जमा केले?"
        );

    if (amountText === null) {
        return;
    }

    const amount =
        Number(amountText);

    if (
        isNaN(amount) ||
        amount <= 0
    ) {

        alert(
            "Valid amount टाका."
        );

        return;
    }

    const selector =
        document.getElementById(
            "monthSelector"
        );

    const month =
        selector
            ? Number(selector.value)
            : currentMonth;

    const now =
        new Date();

    payments.push({

        studentId:
            studentId,

        studentName:
            student.name,

        amount:
            amount,

        month:
            month,

        year:
            currentYear,

        date:
            now.toLocaleDateString(),

        time:
            now.toLocaleTimeString()
    });

    savePayments();

    generateMonthlyReport();

    alert(
        "Payment Added Successfully ✅\n\n" +
        "Student: " +
        student.name +
        "\nAmount: ₹" +
        amount
    );
}


// ========================================
// EDIT TOTAL PAID AMOUNT FOR SELECTED STUDENT + MONTH
function editPayment(studentId) {
    const student = students.find(item => String(item.id) === String(studentId));
    if (!student) {
        alert("Student not found.");
        return;
    }

    const selector = document.getElementById("monthSelector");
    const month = selector ? Number(selector.value) : currentMonth;
    const year = Number(currentYear);
    const records = payments
        .map((payment, index) => ({ payment, index }))
        .filter(item => String(item.payment.studentId) === String(studentId)
            && Number(item.payment.month) === month
            && Number(item.payment.year) === year)
        .sort((a, b) => a.index - b.index);

    const currentPaid = records.reduce((sum, item) => sum + Number(item.payment.amount || 0), 0);
    const amountText = prompt(
        `✏️ ${student.name} — ${new Date(year, month, 1).toLocaleString('en-IN', { month: 'long' })} ${year}\n\nसध्याची एकूण Paid Amount: ₹${currentPaid.toFixed(2)}\nनवीन एकूण Paid Amount (₹) टाका:`,
        currentPaid.toFixed(2)
    );
    if (amountText === null) return;

    const newTotal = Number(amountText);
    if (!Number.isFinite(newTotal) || newTotal < 0) {
        alert("कृपया 0 किंवा त्यापेक्षा जास्त योग्य रक्कम टाका.");
        return;
    }
    if (!records.length && newTotal > 0) {
        alert("या महिन्यात Payment नोंद नाही. आधी Add Payment वापरा.");
        return;
    }

    // Adjust the newest payment first while keeping earlier records intact where possible.
    if (records.length) {
        let remainingTarget = newTotal;
        for (let i = records.length - 1; i >= 0; i--) {
            const item = records[i];
            const old = Number(item.payment.amount || 0);
            const adjusted = Math.min(old, remainingTarget);
            payments[item.index].amount = adjusted;
            if (adjusted !== old) payments[item.index].editedAt = new Date().toISOString();
            remainingTarget -= adjusted;
        }
        if (remainingTarget > 0) {
            // Put any increase on the newest existing payment record.
            const newest = records[records.length - 1];
            payments[newest.index].amount = Number(payments[newest.index].amount || 0) + remainingTarget;
            payments[newest.index].editedAt = new Date().toISOString();
        }
        // Remove zero-value records created by lowering the total; retain unrelated months/students.
        for (let i = payments.length - 1; i >= 0; i--) {
            if (String(payments[i].studentId) === String(studentId)
                && Number(payments[i].month) === month
                && Number(payments[i].year) === year
                && Number(payments[i].amount || 0) <= 0) payments.splice(i, 1);
        }
    }

    savePayments();
    generateMonthlyReport();
    alert(`Paid Amount update झाली ✅\n\nStudent: ${student.name}\nजुनी एकूण रक्कम: ₹${currentPaid.toFixed(2)}\nनवीन एकूण रक्कम: ₹${newTotal.toFixed(2)}`);
}


// ========================================
// STUDENT DETAILS
// ========================================

function showStudentReport(studentId) {

    const student =
        students.find(
            function (item) {
                return item.id === studentId;
            }
        );

    if (!student) {
        return;
    }

    const selector =
        document.getElementById(
            "monthSelector"
        );

    const month =
        selector
            ? Number(selector.value)
            : currentMonth;

    const year =
        currentYear;

    const morningRecords =
        attendance.filter(
            function (record) {

                return (
                    record.studentId === studentId &&
                    record.meal === "morning" &&
                    getMonth(record.date) === month &&
                    getYear(record.date) === year
                );
            }
        );

    const nightRecords =
        attendance.filter(
            function (record) {

                return (
                    record.studentId === studentId &&
                    record.meal === "night" &&
                    getMonth(record.date) === month &&
                    getYear(record.date) === year
                );
            }
        );

    const totalMorning =
        morningRecords.length;

    const totalNight =
        nightRecords.length;

    const totalMeals =
        totalMorning +
        totalNight;

    const totalBill =
        (
            totalMorning *
            mealRates.morning
        ) +
        (
            totalNight *
            mealRates.night
        );

    const paid =
        payments
            .filter(
                function (payment) {

                    return (
                        payment.studentId === studentId &&
                        Number(payment.month) === month &&
                        Number(payment.year) === year
                    );
                }
            )
            .reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        Number(payment.amount || 0)
                    );
                },
                0
            );

    const remaining =
        totalBill -
        paid;

    const section =
        document.getElementById(
            "studentReportSection"
        );

    const details =
        document.getElementById(
            "studentReportDetails"
        );

    const content =
        document.getElementById(
            "studentReportContent"
        );

    const target =
        details ||
        content;

    if (!section || !target) {

        alert(
            "Student Report section HTML मध्ये सापडला नाही."
        );

        return;
    }

    section.style.display =
        "block";

    target.innerHTML = `

        <div class="student-report-card">

            <div class="student-report-header">

                <div>

                    <h2>
                        👤
                        ${escapeHtml(
                            student.name
                        )}
                    </h2>

                    <p>
                        Student ID:
                        ${escapeHtml(
                            student.id
                        )}
                    </p>

                    <p>
                        Room:
                        ${escapeHtml(
                            student.room || "-"
                        )}
                    </p>

                </div>

                <button
                    onclick="
                        closeStudentReport()
                    "
                >
                    ✖ Close
                </button>

            </div>

            <hr>

            <h3>
                📅
                ${months[month]}
                ${year}
            </h3>

            <div class="student-summary">

                <div>
                    🌅 Morning
                    <strong>
                        ${totalMorning}
                    </strong>
                </div>

                <div>
                    🌃 Night
                    <strong>
                        ${totalNight}
                    </strong>
                </div>

                <div>
                    🍽️ Total Meals
                    <strong>
                        ${totalMeals}
                    </strong>
                </div>

                <div>
                    💰 Total Bill
                    <strong>
                        ₹${totalBill}
                    </strong>
                </div>

                <div>
                    💵 Paid
                    <strong>
                        ₹${paid}
                    </strong>
                </div>

                <div>
                    🧾 Remaining
                    <strong>
                        ₹${remaining}
                    </strong>
                </div>

            </div>

            <hr>

            <h3>
                📋 Meal Details
            </h3>

            ${createMealDetailTable(
                morningRecords,
                nightRecords
            )}

        </div>
    `;

    section.scrollIntoView({
        behavior: "smooth"
    });
}


// ========================================
// CREATE MEAL DETAIL TABLE
// ========================================

function createMealDetailTable(
    morningRecords,
    nightRecords
) {

    const dates =
        new Set();

    morningRecords.forEach(
        function (record) {
            dates.add(record.date);
        }
    );

    nightRecords.forEach(
        function (record) {
            dates.add(record.date);
        }
    );

    const sortedDates =
        Array.from(dates).sort();

    if (sortedDates.length === 0) {

        return `
            <p>
                No meals recorded.
            </p>
        `;
    }

    let html = `

        <table>

            <thead>

                <tr>

                    <th>
                        Date
                    </th>

                    <th>
                        🌅 Morning
                    </th>

                    <th>
                        🌃 Night
                    </th>

                </tr>

            </thead>

            <tbody>
    `;

    sortedDates.forEach(
        function (date) {

            const morning =
                morningRecords.find(
                    function (record) {
                        return record.date === date;
                    }
                );

            const night =
                nightRecords.find(
                    function (record) {
                        return record.date === date;
                    }
                );
`

                <tr>

                    <td>
                        ${escapeHtml(date)}
                    </td>

                    <td>

                        ${
                            morning
                                ? "✅ " +
                                  escapeHtml(
                                      morning.time
                                  )
                                : "❌"
                        }

                    </td>

                    <td>

                        ${
                            night
                                ? "✅ " +
                                  escapeHtml(
                                      night.time
                                  )
                                : "❌"
                        }

                    </td>

                </tr>
            `;
        }
    );

    html += `

            </tbody>

        </table>
    `;

    return html;
}


// ========================================
// CLOSE STUDENT REPORT
// ========================================

function closeStudentReport() {

    const section =
        document.getElementById(
            "studentReportSection"
        );

    if (section) {

        section.style.display =
            "none";
    }
}


// ========================================
// GENERATE MONTHLY REPORT PDF
// ========================================

function generateReportPDF() {

    const selector =
        document.getElementById(
            "monthSelector"
        );

    const reportBody =
        document.getElementById(
            "reportBody"
        );

    if (!selector || !reportBody) {

        alert(
            "❌ Monthly Report सापडला नाही."
        );

        return;
    }

    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        alert(
            "❌ jsPDF library सापडली नाही."
        );

        return;
    }

    generateMonthlyReport();

    const month =
        Number(selector.value);

    const monthName =
        months[month];

    const year =
        currentYear;

    const jsPDF =
        window.jspdf.jsPDF;

    const doc =
        new jsPDF(
            "landscape"
        );

    doc.setFontSize(20);

    doc.text(
        "MESS MANAGEMENT",
        148,
        15,
        {
            align: "center"
        }
    );

    doc.setFontSize(15);

    doc.text(
        "Monthly Final Report",
        148,
        25,
        {
            align: "center"
        }
    );

    doc.setFontSize(12);

    doc.text(
        monthName +
        " " +
        year,
        148,
        34,
        {
            align: "center"
        }
    );

    const rows = [];

    const tableRows =
        reportBody.querySelectorAll(
            "tr"
        );

    tableRows.forEach(
        function (row) {

            const cells =
                row.querySelectorAll(
                    "td"
                );

            const data = [];

            cells.forEach(
                function (cell) {

                    let value =
                        cell.innerText
                            .trim();

                    value =
                        value.replace(
                            /₹/g,
                            "Rs. "
                        );

                    data.push(value);
                }
            );

            if (
                data.length >= 7
            ) {

                rows.push(
                    data.slice(0, 7)
                );
            }
        }
    );

    if (rows.length === 0) {

        alert(
            "❌ Report मध्ये data उपलब्ध नाही."
        );

        return;
    }

    if (
        typeof doc.autoTable !==
        "function"
    ) {

        alert(
            "❌ jsPDF AutoTable library सापडली नाही."
        );

        return;
    }

    doc.autoTable({

        head: [[

            "Student",
            "Morning",
            "Night",
            "Total Meals",
            "Total Bill",
            "Paid",
            "Remaining"

        ]],

        body:
            rows,

        startY:
            42,

        theme:
            "grid",

        styles: {

            fontSize:
                9,

            cellPadding:
                3,

            halign:
                "center"

        },

        headStyles: {

            fontSize:
                10,

            halign:
                "center"

        }

    });

    doc.save(
        "Mess_Monthly_Report_" +
        monthName +
        "_" +
        year +
        ".pdf"
    );
}


// ========================================
// LOGOUT
// ========================================

function logout() {

    const confirmed =
        confirm(
            "Logout करायचे आहे का?"
        );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem(
        "adminLoggedIn"
    );

    window.location.href =
        "index.html";
}


// ========================================
// INITIAL LOAD
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupMonthSelector();

        setupStudentForm();

        setupStudentsListSearch();

        setupAttendanceSearch();

        setupMealRateButton();

        displayStudents();

        generateAttendance();

        displayHistory();

        loadMealRates();

        generateMonthlyReport();

    }
);

document.addEventListener("DOMContentLoaded", function () {
    setupLeaveApplicationForm();
    updateLeaveStudentOptions();
    renderLeaveRequests();
});
