import { prisma } from "../db.js";
import { ScheduleService } from "./schedule.service.js";
import { PiketService } from "./piket.service.js";
import { TaskService } from "./task.service.js";

export class ReminderService {
    /**
     * Generate clean WhatsApp formatted reminder message for a given date (usually tomorrow)
     */
    public static async generateDailyDigest(
        targetDate: Date,
        className: string = "RPL A"
    ): Promise<string> {
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const monthNames = [
            "Januari",
            "Februari",
            "Maret",
            "April",
            "Mei",
            "Juni",
            "Juli",
            "Agustus",
            "September",
            "Oktober",
            "November",
            "Desember",
        ];

        const dayName = dayNames[targetDate.getDay()];
        const dateFormatted = `${targetDate.getDate()} ${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
        const dayOfWeek = targetDate.getDay(); // 1: Senin .. 5: Jumat

        // 1. Fetch Tomorrow's Schedule
        const schedule = await ScheduleService.getScheduleForDate(targetDate, className);

        // 2. Fetch Tomorrow's Piket
        const piketList = await PiketService.getPiketForDay(dayOfWeek);

        // 3. Fetch Active PR / Tasks
        const activeTasks = await TaskService.getActiveTasks();

        // 4. Fetch Active Notes
        const notes = await prisma.note.findMany({
            where: { isActive: true },
            orderBy: { id: "asc" },
        });

        // Determine room if available
        const roomInfo =
            schedule.length > 0 && schedule[0].room ? ` (Ruang: ${schedule[0].room})` : "";

        // Build Message
        const lines: string[] = [];
        lines.push(`Assalamualaikum wr wb.`);
        lines.push(`✨ *Jadwal untuk ${dayName}, ${dateFormatted}${roomInfo}* ✨`);

        if (schedule.length === 0) {
            lines.push(`_Tidak ada jadwal KBM / Libur._`);
        } else {
            schedule.forEach((s, idx) => {
                const teacher = s.teacherName ? ` (${s.teacherName})` : "";
                lines.push(`${idx + 1}. *${s.subjectName}*${teacher}`);
            });
        }

        lines.push(``);
        lines.push(
            `🧹 *Jadwal piket ${targetDate.getDate()}-${targetDate.getMonth() + 1}-${targetDate.getFullYear()}* 🧹`
        );
        if (piketList.length === 0) {
            lines.push(`_Belum ada jadwal piket yang diatur._`);
        } else {
            piketList.forEach((student, idx) => {
                lines.push(`${idx + 1}. ${student}`);
            });
        }

        lines.push(``);
        lines.push(`📚 *PR / Tugas Aktif* =`);
        if (activeTasks.length === 0) {
            lines.push(`_Tidak ada PR aktif (Alhamdulillah!)_`);
        } else {
            activeTasks.forEach((t, idx) => {
                const d = new Date(t.deadline);
                const deadlineStr = `${d.getDate()} ${monthNames[d.getMonth()]}`;
                lines.push(`${idx + 1}. [Deadline: ${deadlineStr}] ${t.description}`);
            });
        }

        lines.push(``);
        lines.push(`*NB :*`);
        if (notes.length === 0) {
            lines.push(`1. Jangan lupa selalu membawa perlengkapan sekolah.`);
        } else {
            notes.forEach((n, idx) => {
                lines.push(`${idx + 1}. ${n.text}`);
            });
        }

        lines.push(``);
        lines.push(`Sekian terimakasih 🤩🙏🏻🙏🏻`);
        lines.push(`Wassalamu'alaikum wr wb`);

        return lines.join("\n");
    }
}
