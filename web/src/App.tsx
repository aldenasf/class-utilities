import React, { useState, useEffect } from "react";
import {
    Calendar,
    CheckSquare,
    Users,
    Settings,
    Bell,
    RefreshCw,
    Plus,
    Trash2,
    CheckCircle2,
    Circle,
    Lock,
    FileSpreadsheet,
    Send,
} from "lucide-react";

export default function App() {
    const [activeTab, setActiveTab] = useState<"overview" | "jadwal" | "piket" | "tugas" | "settings">("overview");
    const [adminPin, setAdminPin] = useState<string>(localStorage.getItem("admin_pin") || "1234");
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [tempPin, setTempPin] = useState(adminPin);

    // Data states
    const [statusData, setStatusData] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [currentWeek, setCurrentWeek] = useState<number>(4);
    const [weekSchedule, setWeekSchedule] = useState<any[]>([]);
    const [piketData, setPiketData] = useState<Record<number, string[]>>({
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
    });
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Excel Range Importer states
    const [excelParams, setExcelParams] = useState({
        className: "RPL A",
        weekRow: 8,
        slotRow: 9,
        dateRow: 33,
    });
    const [parsedPreview, setParsedPreview] = useState<any>(null);

    // New task form state
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskDeadline, setNewTaskDeadline] = useState("");

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 4000);
    };

    const headers = {
        "Content-Type": "application/json",
        "x-admin-pin": adminPin,
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/status");
            const data = await res.json();
            setStatusData(data);
            if (data.currentWeek) setCurrentWeek(data.currentWeek);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/tasks");
            setTasks(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchSchedule = async (w: number) => {
        try {
            const res = await fetch(`/api/schedule/week/${w}`);
            setWeekSchedule(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPiket = async () => {
        try {
            const res = await fetch("/api/piket");
            setPiketData(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            setSettings(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchTasks();
        fetchPiket();
        fetchSettings();

        const timer = setInterval(() => {
            fetchStatus();
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchSchedule(currentWeek);
    }, [currentWeek]);

    // Task actions
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskDesc || !newTaskDeadline) return;
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers,
                body: JSON.stringify({ description: newTaskDesc, deadline: newTaskDeadline }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setNewTaskDesc("");
            setNewTaskDeadline("");
            fetchTasks();
            fetchStatus();
            showToast("Tugas baru berhasil ditambahkan!");
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleToggleTask = async (id: number) => {
        try {
            const res = await fetch(`/api/tasks/${id}/toggle`, { method: "PATCH", headers });
            if (!res.ok) throw new Error((await res.json()).error);
            fetchTasks();
            fetchStatus();
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const handleDeleteTask = async (id: number) => {
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: "DELETE", headers });
            if (!res.ok) throw new Error((await res.json()).error);
            fetchTasks();
            fetchStatus();
            showToast("Tugas dihapus.");
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    // Piket save
    const handleSavePiket = async (day: number) => {
        try {
            const res = await fetch("/api/piket", {
                method: "POST",
                headers,
                body: JSON.stringify({ dayOfWeek: day, students: piketData[day] }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            showToast(`Jadwal piket hari berhasil disimpan!`);
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    // Manual Trigger
    const handleTriggerReminder = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/reminder/trigger", { method: "POST", headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.message);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // Excel Range Importer
    const handleParseExcel = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/excel/parse", {
                method: "POST",
                headers,
                body: JSON.stringify(excelParams),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setParsedPreview(data);
            showToast("Preview Excel berhasil dibaca!");
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncExcel = async () => {
        if (!parsedPreview) return;
        try {
            setLoading(true);
            const res = await fetch("/api/excel/sync", {
                method: "POST",
                headers,
                body: JSON.stringify(parsedPreview),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(`Sukses sinkronisasi jadwal (${data.result.scheduleCount} slot)!`);
            fetchSchedule(currentWeek);
            fetchStatus();
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const daysLabel = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
            {/* Toast Notification */}
            {msg && (
                <div
                    className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg font-medium text-white transition-all ${msg.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}
                >
                    {msg.text}
                </div>
            )}

            {/* Top Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 font-bold text-xl">
                            U
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 leading-tight">Utility Kelas</h1>
                            <p className="text-xs text-slate-500 font-medium">Asisten & Manajemen Kelas XI RPL</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => {
                                setTempPin(adminPin);
                                setPinModalOpen(true);
                            }}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                adminPin
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                    : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>PIN Admin: {adminPin ? "Aktif" : "Kosong"}</span>
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-6xl mx-auto px-4 flex space-x-1 border-t border-slate-100">
                    {[
                        { id: "overview", label: "Ringkasan", icon: Bell },
                        { id: "jadwal", label: "Jadwal Blok & Excel", icon: Calendar },
                        { id: "piket", label: "Piket Kelas", icon: Users },
                        { id: "tugas", label: "Tugas / PR", icon: CheckSquare },
                        { id: "settings", label: "Pengaturan", icon: Settings },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                                    isActive
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto px-4 mt-6">
                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Live WhatsApp QR Scan Card */}
                        {!statusData?.whatsappReady && statusData?.qrCodeUrl && (
                            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
                                        Perlu Tautan WhatsApp
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 mt-2">Hubungkan Bot WhatsApp</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-md">
                                        Buka aplikasi WhatsApp di HP Anda &gt; menu{" "}
                                        <strong>Titik Tiga / Pengaturan</strong> &gt; pilih{" "}
                                        <strong>Perangkat Tertaut</strong> &gt; arahkan kamera ke QR Code di samping.
                                    </p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                    <img
                                        src={statusData.qrCodeUrl}
                                        alt="WhatsApp QR Code"
                                        className="w-48 h-48 rounded-lg"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 animate-pulse">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> QR otomatis diperbarui
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Status Bot WhatsApp
                                    </p>
                                    <p className="text-xl font-bold text-slate-900 mt-1 flex items-center space-x-2">
                                        <span
                                            className={`w-3 h-3 rounded-full ${statusData?.whatsappReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
                                        />
                                        <span>{statusData?.whatsappReady ? "Online & Siap" : "Siap / Standby"}</span>
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                    <Bell className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Tugas / PR Aktif
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">
                                        {statusData?.activeTasksCount || 0} Tugas
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                    <CheckSquare className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Minggu Pembelajaran
                                    </p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">Minggu ke-{currentWeek}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                    <Calendar className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions & WhatsApp Message Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                                        <Send className="w-5 h-5 text-indigo-600" />
                                        <span>Pengiriman Pengingat Manual</span>
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Scheduler harian otomatis berjalan tiap jam 18.30 WIB. Anda juga bisa menguji
                                        pengiriman rekap esok hari secara langsung ke grup WhatsApp kelas kapan saja.
                                    </p>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400">
                                        Target: Grup Kelas XI RPL A
                                    </span>
                                    <button
                                        onClick={handleTriggerReminder}
                                        disabled={loading}
                                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                        <span>Kirim Pengingat Sekarang</span>
                                    </button>
                                </div>
                            </div>

                            {/* Live Preview WhatsApp Message */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
                                    <span>📱 Pratinjau Pesan Rekap WhatsApp</span>
                                </h3>
                                <div className="bg-emerald-950/5 border border-emerald-900/10 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                                    {statusData?.tomorrowPreview || "Memuat pratinjau pesan..."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* JADWAL BLOK & EXCEL TAB */}
                {activeTab === "jadwal" && (
                    <div className="space-y-6">
                        {/* Range Selector & Excel Importer Wizard */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                <span>Interactive Schedule Range Selector (Excel Importer)</span>
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 mb-4">
                                Pilih parameter baris pada file master Excel untuk menyesuaikan pembacaan jadwal secara
                                fleksibel tanpa takut layout bergeser.
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Nama Kelas
                                    </label>
                                    <input
                                        type="text"
                                        value={excelParams.className}
                                        onChange={(e) =>
                                            setExcelParams({
                                                ...excelParams,
                                                className: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Baris Minggu (Week)
                                    </label>
                                    <input
                                        type="number"
                                        value={excelParams.weekRow}
                                        onChange={(e) =>
                                            setExcelParams({
                                                ...excelParams,
                                                weekRow: parseInt(e.target.value, 10),
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Baris Slot Pelajaran
                                    </label>
                                    <input
                                        type="number"
                                        value={excelParams.slotRow}
                                        onChange={(e) =>
                                            setExcelParams({
                                                ...excelParams,
                                                slotRow: parseInt(e.target.value, 10),
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Baris Rentang Tanggal
                                    </label>
                                    <input
                                        type="number"
                                        value={excelParams.dateRow}
                                        onChange={(e) =>
                                            setExcelParams({
                                                ...excelParams,
                                                dateRow: parseInt(e.target.value, 10),
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex items-center space-x-3">
                                <button
                                    onClick={handleParseExcel}
                                    disabled={loading}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow transition-all"
                                >
                                    {loading ? "Membaca Excel..." : "1. Pratinjau Pembacaan Excel"}
                                </button>
                                {parsedPreview && (
                                    <button
                                        onClick={handleSyncExcel}
                                        disabled={loading}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition-all"
                                    >
                                        2. Simpan & Terapkan ke Database
                                    </button>
                                )}
                            </div>

                            {parsedPreview && (
                                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                                    ✅ Terbaca: <strong>{parsedPreview.teachers?.length}</strong> Guru & Kode Mapel,{" "}
                                    <strong>{parsedPreview.schedule?.length}</strong> Slot Jadwal Pelajaran untuk kelas{" "}
                                    <strong>{parsedPreview.className}</strong>.
                                </div>
                            )}
                        </div>

                        {/* Week Selector Bar */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-slate-800">
                                    Pilih Minggu Pembelajaran (1 s/d 20):
                                </h4>
                                <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                    Sedang Ditampilkan: Minggu ke-{currentWeek}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setCurrentWeek(w)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                            currentWeek === w
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        }`}
                                    >
                                        Mg {w}
                                    </button>
                                ))}
                            </div>

                            {/* Schedule Table */}
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                            <th className="py-3 px-4">Slot Waktu</th>
                                            <th className="py-3 px-4">Kode Mapel</th>
                                            <th className="py-3 px-4">Mata Pelajaran</th>
                                            <th className="py-3 px-4">Guru Pengampu</th>
                                            <th className="py-3 px-4">Ruangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {weekSchedule.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-slate-400">
                                                    Belum ada data jadwal untuk minggu ke-
                                                    {currentWeek}. Silakan klik tombol "Simpan & Terapkan ke Database"
                                                    di atas.
                                                </td>
                                            </tr>
                                        ) : (
                                            weekSchedule.map((s, idx) => {
                                                const isBengkel =
                                                    s.code === "1" ||
                                                    s.code === "2" ||
                                                    s.code === "3" ||
                                                    s.code === "4" ||
                                                    s.code === "5";
                                                const isL1 = s.code === "L1";
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="py-3 px-4 font-semibold text-slate-700">
                                                            Waktu {s.slotNumber}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span
                                                                className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                                                    isBengkel
                                                                        ? "bg-emerald-100 text-emerald-800"
                                                                        : isL1
                                                                          ? "bg-fuchsia-100 text-fuchsia-800"
                                                                          : "bg-slate-100 text-slate-800"
                                                                }`}
                                                            >
                                                                {s.code}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-slate-900">
                                                            {s.subjectName}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600">
                                                            {s.teacherName || "-"}
                                                        </td>
                                                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                                                            {s.room || "-"}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* PIKET TAB */}
                {activeTab === "piket" && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <span>Pengaturan Petugas Piket Harian (Senin - Jumat)</span>
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Masukkan nama-nama siswa yang bertugas piket dipisahkan dengan koma atau baris baru.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map((day) => (
                                    <div
                                        key={day}
                                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between"
                                    >
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-800 mb-2">{daysLabel[day]}</h4>
                                            <textarea
                                                rows={6}
                                                value={(piketData[day] || []).join("\n")}
                                                onChange={(e) => {
                                                    const val = e.target.value.split("\n").filter(Boolean);
                                                    setPiketData({ ...piketData, [day]: val });
                                                }}
                                                placeholder="Contoh:&#10;Alden&#10;Adam D&#10;Fadil"
                                                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSavePiket(day)}
                                            className="mt-3 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                                        >
                                            Simpan {daysLabel[day]}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TUGAS TAB */}
                {activeTab === "tugas" && (
                    <div className="space-y-6">
                        {/* Add Task Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                                <Plus className="w-5 h-5 text-indigo-600" />
                                <span>Tambah Tugas / PR Baru</span>
                            </h3>
                            <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Deskripsi Tugas
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: MP Data Analyst Jobsheet 5"
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Tanggal Deadline
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="date"
                                            required
                                            value={newTaskDeadline}
                                            onChange={(e) => setNewTaskDeadline(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow transition-all whitespace-nowrap"
                                        >
                                            Tambah
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Task Table */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900 mb-4">Daftar Semua Tugas Kelas</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                            <th className="py-3 px-4 w-12">Status</th>
                                            <th className="py-3 px-4">Deskripsi Tugas</th>
                                            <th className="py-3 px-4">Deadline</th>
                                            <th className="py-3 px-4">Pembuat</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tasks.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-slate-400">
                                                    Belum ada tugas tercatat.
                                                </td>
                                            </tr>
                                        ) : (
                                            tasks.map((t) => {
                                                const d = new Date(t.deadline);
                                                const deadlineFormatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <button
                                                                onClick={() => handleToggleTask(t.id)}
                                                                className="text-slate-400 hover:text-indigo-600"
                                                            >
                                                                {t.isCompleted ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                ) : (
                                                                    <Circle className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td
                                                            className={`py-3 px-4 font-medium ${t.isCompleted ? "line-through text-slate-400" : "text-slate-900"}`}
                                                        >
                                                            {t.description}
                                                        </td>
                                                        <td className="py-3 px-4 font-mono text-slate-600">
                                                            {deadlineFormatted}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-500">
                                                            {t.createdBy || "-"}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteTask(t.id)}
                                                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === "settings" && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl space-y-5">
                        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                            <Settings className="w-5 h-5 text-indigo-600" />
                            <span>Pengaturan Sistem & Notifikasi</span>
                        </h3>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Jam Pengingat Harian (WIB)
                            </label>
                            <input
                                type="text"
                                placeholder="18:30"
                                value={settings["reminder_time"] || "18:30"}
                                onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                            />
                            <p className="text-xs text-slate-400 mt-1">Format: 24 jam (JJ:MM), misal 18:30</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Status Pengingat Otomatis
                            </label>
                            <select
                                value={settings["reminder_enabled"] || "true"}
                                onChange={(e) => setSettings({ ...settings, reminder_enabled: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="true">Aktif (Kirim pesan otomatis setiap sore/malam)</option>
                                <option value="false">Nonaktif (Hanya kirim saat diminta manual)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                JID Grup WhatsApp Kelas
                            </label>
                            <input
                                type="text"
                                placeholder="Otomatis terisi saat bot aktif di grup..."
                                value={settings["class_group_jid"] || ""}
                                onChange={(e) => setSettings({ ...settings, class_group_jid: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                            />
                        </div>

                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch("/api/settings", {
                                        method: "POST",
                                        headers,
                                        body: JSON.stringify(settings),
                                    });
                                    if (!res.ok) throw new Error((await res.json()).error);
                                    showToast("Pengaturan berhasil disimpan!");
                                } catch (err: any) {
                                    showToast(err.message, "error");
                                }
                            }}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                        >
                            Simpan Pengaturan
                        </button>
                    </div>
                )}
            </main>

            {/* PIN Admin Modal */}
            {pinModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
                        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
                            <Lock className="w-5 h-5 text-indigo-600" />
                            <span>Kunci Akses Admin Web</span>
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Masukkan Master PIN Admin agar dapat mengubah jadwal, piket, dan pengaturan.
                        </p>
                        <input
                            type="password"
                            placeholder="Masukkan PIN Admin (default: 1234)"
                            value={tempPin}
                            onChange={(e) => setTempPin(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                        />
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPinModalOpen(false)}
                                className="w-1/2 py-2 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setAdminPin(tempPin);
                                    localStorage.setItem("admin_pin", tempPin);
                                    setPinModalOpen(false);
                                    showToast("PIN Admin tersimpan di browser.");
                                }}
                                className="w-1/2 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow"
                            >
                                Terapkan PIN
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
