import { BlockScheduleParser } from "../src/core/excel/parser.js";
import path from "path";

const excelFile = path.resolve(process.cwd(), "MASTER BLOK GANJIL 2026-2027 KELAS XI-2.xlsx");
const targetClass = process.argv[2] || "RPL A";

console.log(`\n======================================================`);
console.log(`🧪 Testing Standalone Block Schedule Parser`);
console.log(`📂 File: ${excelFile}`);
console.log(`🏫 Target Class: ${targetClass}`);
console.log(`======================================================\n`);

try {
    const result = BlockScheduleParser.parse({
        filePath: excelFile,
        targetClassName: targetClass,
    });

    console.log(`✅ Sukses membaca data untuk kelas: ${result.className}`);
    console.log(`👨‍🏫 Total Guru/Kode Mapel terdaftar: ${result.teachers.length}`);
    console.log(`📅 Total Slot Pelajaran terbaca: ${result.schedule.length}`);
    console.log(`📆 Total Minggu/Agenda Kalender: ${result.weeks.length}`);

    console.log(`\n--- Contoh 5 Guru Teratas ---`);
    console.table(result.teachers.slice(0, 5));

    console.log(`\n--- Jadwal Minggu ke-4 (Sesuai Contoh README) ---`);
    const week4 = result.schedule.filter((s) => s.weekNumber === 4);
    const week4Resolved = week4.map((s) => {
        const t = result.teachers.find((teacher) => teacher.code === s.code);
        return {
            "Waktu/Hari": `Slot ${s.slotNumber}`,
            Kode: s.code,
            "Mata Pelajaran": t?.subjectName || "-",
            Guru: t?.teacherName || "-",
            Ruang: s.room || "-",
        };
    });
    console.table(week4Resolved);

    console.log(`\n--- Contoh Agenda Khusus / Ujian di Akhir Semester ---`);
    const events = result.weeks.filter((w) => w.eventNote);
    console.table(
        events.map((e) => ({
            Minggu: e.weekNumber,
            "Rentang Tanggal": e.dateRangeStr,
            "Agenda Khusus": e.eventNote,
        }))
    );

    console.log(`\n🎉 Test parser mandiri BERHASIL!`);
} catch (error) {
    console.error(`❌ Error parsing Excel:`, error);
    process.exit(1);
}
