// Utility Kelas - Minimal Dashboard Client
(function () {
    const state = {
        activeTab: "tab-overview",
        adminPin: localStorage.getItem("admin_pin") || "1234",
        currentWeek: 4,
        status: null,
        tasks: [],
        schedule: [],
        piket: { 1: [], 2: [], 3: [], 4: [], 5: [] },
        settings: {},
    };

    // Elements
    const el = {
        toast: document.getElementById("toast"),
        headerBadge: document.getElementById("header-status-badge"),
        pinInput: document.getElementById("admin-pin-input"),
        navTabs: document.querySelectorAll(".nav-tab"),
        tabContents: document.querySelectorAll(".tab-content"),
        qrContainer: document.getElementById("qr-container"),
        qrImage: document.getElementById("qr-image"),
        statWa: document.getElementById("stat-wa-status"),
        statTasks: document.getElementById("stat-tasks-count"),
        statWeek: document.getElementById("stat-current-week"),
        previewDigest: document.getElementById("preview-digest"),
        btnTriggerReminder: document.getElementById("btn-trigger-reminder"),
        formAddTask: document.getElementById("form-add-task"),
        inputTaskDesc: document.getElementById("input-task-desc"),
        inputTaskDeadline: document.getElementById("input-task-deadline"),
        tasksContainer: document.getElementById("tasks-list-container"),
        selectWeek: document.getElementById("select-week"),
        btnSyncExcel: document.getElementById("btn-sync-excel"),
        scheduleTbody: document.getElementById("schedule-tbody"),
        piketContainer: document.getElementById("piket-cards-container"),
        formSettings: document.getElementById("form-settings"),
        settingReminderTime: document.getElementById("setting-reminder-time"),
        settingCurrentWeek: document.getElementById("setting-current-week"),
        settingAdminPin: document.getElementById("setting-admin-pin"),
    };

    // Helper: Toast
    let toastTimeout;
    function showToast(text, isError = false) {
        if (!el.toast) return;
        clearTimeout(toastTimeout);
        el.toast.textContent = text;
        el.toast.className = `fixed top-4 right-4 z-50 px-4 py-2 text-xs font-medium rounded border shadow-sm transition-all ${
            isError ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
        }`;
        el.toast.classList.remove("hidden");
        toastTimeout = setTimeout(() => {
            el.toast.classList.add("hidden");
        }, 3000);
    }

    // Helper: API Request
    async function api(path, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            "x-admin-pin": state.adminPin,
            ...(options.headers || {}),
        };
        const res = await fetch(path, { ...options, headers });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const errorMsg = data?.error || `HTTP error ${res.status}`;
            throw new Error(errorMsg);
        }
        return data;
    }

    // Admin PIN handling
    if (el.pinInput) {
        el.pinInput.value = state.adminPin;
        el.pinInput.addEventListener("change", (e) => {
            state.adminPin = e.target.value.trim();
            localStorage.setItem("admin_pin", state.adminPin);
            showToast("PIN Admin diperbarui");
        });
    }

    // Tab Navigation
    el.navTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const targetId = tab.dataset.tab;
            state.activeTab = targetId;
            el.navTabs.forEach((t) => {
                const isActive = t.dataset.tab === targetId;
                t.className = `nav-tab px-3 py-2 text-xs font-medium border-b-2 transition ${
                    isActive ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`;
            });
            el.tabContents.forEach((c) => {
                c.classList.toggle("hidden", c.id !== targetId);
            });

            // Lazy fetch tab data
            if (targetId === "tab-tasks") fetchTasks();
            if (targetId === "tab-schedule") fetchWeeks();
            if (targetId === "tab-piket") fetchPiket();
            if (targetId === "tab-settings") fetchSettings();
        });
    });

    // 1. Overview / Status
    async function fetchStatus() {
        try {
            const data = await api("/api/status");
            state.status = data;
            state.currentWeek = data.currentWeek || state.currentWeek;

            // Header status
            if (el.headerBadge) {
                if (data.whatsappReady) {
                    el.headerBadge.textContent = "WA Terhubung";
                    el.headerBadge.className = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700";
                } else {
                    el.headerBadge.textContent = "WA Menunggu QR";
                    el.headerBadge.className = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700";
                }
            }

            // Stat cards
            if (el.statWa) el.statWa.textContent = data.whatsappReady ? "Online & Terhubung" : "Menunggu Scan";
            if (el.statTasks) el.statTasks.textContent = `${data.activeTasksCount ?? 0} Tugas`;
            if (el.statWeek) el.statWeek.textContent = `Minggu ke-${data.currentWeek ?? "-"}`;

            // QR code container
            if (el.qrContainer && el.qrImage) {
                if (!data.whatsappReady && data.qrCodeUrl) {
                    el.qrImage.src = data.qrCodeUrl;
                    el.qrContainer.classList.remove("hidden");
                } else {
                    el.qrContainer.classList.add("hidden");
                }
            }

            // Digest preview
            if (el.previewDigest) {
                el.previewDigest.textContent = data.tomorrowPreview || "Belum ada rekap untuk esok hari.";
            }
        } catch (e) {
            console.error("Status fetch error:", e);
        }
    }

    // Manual Reminder Trigger
    if (el.btnTriggerReminder) {
        el.btnTriggerReminder.addEventListener("click", async () => {
            el.btnTriggerReminder.disabled = true;
            try {
                const res = await api("/api/reminder/trigger", { method: "POST" });
                showToast(res.message || "Pengingat berhasil dikirim!");
            } catch (err) {
                showToast(err.message, true);
            } finally {
                el.btnTriggerReminder.disabled = false;
            }
        });
    }

    // 2. Tasks Management
    async function fetchTasks() {
        try {
            const tasks = await api("/api/tasks");
            state.tasks = tasks;
            renderTasks();
        } catch (err) {
            showToast(err.message, true);
        }
    }

    function renderTasks() {
        if (!el.tasksContainer) return;
        if (!state.tasks || state.tasks.length === 0) {
            el.tasksContainer.innerHTML = '<div class="p-4 text-center text-xs text-neutral-400">Tidak ada tugas / PR yang terdaftar.</div>';
            return;
        }

        el.tasksContainer.innerHTML = state.tasks
            .map((task) => {
                const deadline = new Date(task.deadline).toLocaleDateString("id-ID", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
                return `
                <div class="p-3 flex items-center justify-between gap-3 text-xs">
                    <label class="flex items-center space-x-2.5 flex-1 cursor-pointer">
                        <input type="checkbox" ${task.isCompleted ? "checked" : ""} data-id="${task.id}" class="task-checkbox rounded border-neutral-300 text-neutral-900 focus:ring-0" />
                        <span class="${task.isCompleted ? "line-through text-neutral-400" : "text-neutral-800 font-medium"}">${escapeHtml(task.description)}</span>
                    </label>
                    <div class="flex items-center space-x-3 text-neutral-400">
                        <span class="text-[11px] font-mono">${deadline}</span>
                        <button data-id="${task.id}" class="btn-delete-task hover:text-red-600 transition">Hapus</button>
                    </div>
                </div>`;
            })
            .join("");

        // Bind event listeners
        el.tasksContainer.querySelectorAll(".task-checkbox").forEach((cb) => {
            cb.addEventListener("change", async (e) => {
                const id = e.target.dataset.id;
                try {
                    await api(`/api/tasks/${id}/toggle`, { method: "PATCH" });
                    fetchTasks();
                    fetchStatus();
                } catch (err) {
                    showToast(err.message, true);
                }
            });
        });

        el.tasksContainer.querySelectorAll(".btn-delete-task").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                try {
                    await api(`/api/tasks/${id}`, { method: "DELETE" });
                    showToast("Tugas dihapus");
                    fetchTasks();
                    fetchStatus();
                } catch (err) {
                    showToast(err.message, true);
                }
            });
        });
    }

    if (el.formAddTask) {
        el.formAddTask.addEventListener("submit", async (e) => {
            e.preventDefault();
            const desc = el.inputTaskDesc.value.trim();
            const deadline = el.inputTaskDeadline.value;
            if (!desc || !deadline) return;

            try {
                await api("/api/tasks", {
                    method: "POST",
                    body: JSON.stringify({ description: desc, deadline, createdBy: "Web Admin" }),
                });
                el.inputTaskDesc.value = "";
                el.inputTaskDeadline.value = "";
                showToast("Tugas berhasil ditambahkan");
                fetchTasks();
                fetchStatus();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    // 3. Schedule Management
    async function fetchWeeks() {
        try {
            const weeks = await api("/api/schedule/weeks");
            if (el.selectWeek) {
                el.selectWeek.innerHTML = "";
                const totalWeeks = weeks.length > 0 ? weeks.length : 24;
                for (let i = 1; i <= totalWeeks; i++) {
                    const opt = document.createElement("option");
                    opt.value = i;
                    opt.textContent = `Minggu ke-${i}`;
                    if (i === state.currentWeek) opt.selected = true;
                    el.selectWeek.appendChild(opt);
                }
                fetchWeekSchedule(state.currentWeek);
            }
        } catch (err) {
            console.error(err);
        }
    }

    if (el.selectWeek) {
        el.selectWeek.addEventListener("change", (e) => {
            const week = parseInt(e.target.value, 10);
            fetchWeekSchedule(week);
        });
    }

    async function fetchWeekSchedule(weekNum) {
        if (!el.scheduleTbody) return;
        try {
            const slots = await api(`/api/schedule/week/${weekNum}`);
            state.schedule = slots;
            if (!slots || slots.length === 0) {
                el.scheduleTbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-xs text-neutral-400">Tidak ada jadwal untuk minggu ${weekNum}. Klik tombol sinkronkan jika belum ada data.</td></tr>`;
                return;
            }

            el.scheduleTbody.innerHTML = slots
                .map((slot) => {
                    return `
                    <tr class="hover:bg-neutral-50/50">
                        <td class="py-2 px-3 font-mono font-medium text-neutral-500">Slot ${slot.slotNumber}</td>
                        <td class="py-2 px-3 font-medium text-neutral-900">${escapeHtml(slot.subjectName)}</td>
                        <td class="py-2 px-3 text-neutral-600">${escapeHtml(slot.teacherName || "-")}</td>
                        <td class="py-2 px-3 text-neutral-500 font-mono">${escapeHtml(slot.room || "-")}</td>
                    </tr>`;
                })
                .join("");
        } catch (err) {
            showToast(err.message, true);
        }
    }

    if (el.btnSyncExcel) {
        el.btnSyncExcel.addEventListener("click", async () => {
            el.btnSyncExcel.disabled = true;
            el.btnSyncExcel.textContent = "Menyinkronkan...";
            try {
                // 1. Parse Excel default
                const parsed = await api("/api/excel/parse", {
                    method: "POST",
                    body: JSON.stringify({ className: "RPL A", weekRow: 8, slotRow: 9, dateRow: 33 }),
                });
                // 2. Sync parsed
                const synced = await api("/api/excel/sync", {
                    method: "POST",
                    body: JSON.stringify(parsed),
                });
                showToast(`Jadwal Excel berhasil disinkronkan (${synced.result?.scheduleCount || 0} slot)`);
                fetchWeeks();
                fetchStatus();
            } catch (err) {
                showToast(err.message, true);
            } finally {
                el.btnSyncExcel.disabled = false;
                el.btnSyncExcel.textContent = "Sinkronkan dari File Excel";
            }
        });
    }

    // 4. Piket Management
    const daysLabel = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    async function fetchPiket() {
        try {
            const data = await api("/api/piket");
            state.piket = data;
            renderPiket();
        } catch (err) {
            showToast(err.message, true);
        }
    }

    function renderPiket() {
        if (!el.piketContainer) return;
        el.piketContainer.innerHTML = [1, 2, 3, 4, 5]
            .map((day) => {
                const students = (state.piket[day] || []).join("\n");
                return `
                <div class="p-3 bg-white border border-neutral-200 rounded flex flex-col space-y-2">
                    <span class="text-xs font-semibold text-neutral-900">${daysLabel[day]}</span>
                    <textarea
                        data-day="${day}"
                        rows="6"
                        placeholder="1 nama per baris"
                        class="piket-textarea w-full p-2 text-xs border border-neutral-200 rounded focus:outline-none focus:border-neutral-900 font-mono resize-none"
                    >${escapeHtml(students)}</textarea>
                    <button data-day="${day}" class="btn-save-piket px-2 py-1 text-[11px] font-medium border border-neutral-300 hover:border-neutral-900 rounded bg-white text-neutral-800 transition">
                        Simpan
                    </button>
                </div>`;
            })
            .join("");

        el.piketContainer.querySelectorAll(".btn-save-piket").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                const day = parseInt(e.target.dataset.day, 10);
                const textarea = el.piketContainer.querySelector(`.piket-textarea[data-day="${day}"]`);
                const students = textarea.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean);

                try {
                    await api("/api/piket", {
                        method: "POST",
                        body: JSON.stringify({ dayOfWeek: day, students }),
                    });
                    showToast(`Piket ${daysLabel[day]} disimpan`);
                } catch (err) {
                    showToast(err.message, true);
                }
            });
        });
    }

    // 5. Settings Management
    async function fetchSettings() {
        try {
            const settings = await api("/api/settings");
            state.settings = settings;
            if (el.settingReminderTime) el.settingReminderTime.value = settings.reminder_time || "18:30";
            if (el.settingCurrentWeek) el.settingCurrentWeek.value = settings.current_week || state.currentWeek;
            if (el.settingAdminPin) el.settingAdminPin.value = settings.admin_pin || state.adminPin;
        } catch (err) {
            console.error(err);
        }
    }

    if (el.formSettings) {
        el.formSettings.addEventListener("submit", async (e) => {
            e.preventDefault();
            const updates = {
                reminder_time: el.settingReminderTime.value.trim() || "18:30",
                current_week: el.settingCurrentWeek.value.trim() || "4",
            };
            const newPin = el.settingAdminPin.value.trim();
            if (newPin) {
                updates.admin_pin = newPin;
                state.adminPin = newPin;
                localStorage.setItem("admin_pin", newPin);
                if (el.pinInput) el.pinInput.value = newPin;
            }

            try {
                await api("/api/settings", {
                    method: "POST",
                    body: JSON.stringify(updates),
                });
                showToast("Pengaturan berhasil disimpan");
                fetchStatus();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial load & periodic poll
    fetchStatus();
    setInterval(fetchStatus, 3000);
})();
