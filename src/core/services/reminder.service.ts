import { prisma } from "../db.js";
import { ScheduleService } from "./schedule.service.js";
import { PiketService } from "./piket.service.js";
import { TaskService } from "./task.service.js";
import type { DailyDigestData } from "./types.js";
import { ID_DAYS, ID_MONTHS, formatIndonesianDate, isWeekend } from "../utils/date.js";

export class ReminderService {
    /**
     * Retrieve all structured data needed for the daily digest.
     * Can be consumed directly by REST API, future Discord bot, or test scripts.
     */
    public static async getDailyDigestData(
        targetDate: Date,
        className: string = "RPL A"
    ): Promise<DailyDigestData> {
        const dayOfWeek = targetDate.getDay();
        const effectiveWeek = await ScheduleService.getEffectiveWeekNumber(targetDate);

        const [schedule, piket, tasks, notes] = await Promise.all([
            ScheduleService.getScheduleForDate(targetDate, className),
            PiketService.getPiketForDay(dayOfWeek),
            TaskService.getActiveTasks(),
            prisma.note.findMany({
                where: { isActive: true },
                orderBy: { id: "asc" },
            }),
        ]);

        return {
            targetDate,
            dayName: ID_DAYS[dayOfWeek],
            dateFormatted: formatIndonesianDate(targetDate),
            isWeekend: isWeekend(targetDate),
            effectiveWeek,
            schedule,
            piket,
            tasks,
            notes,
        };
    }

    /**
     * Pure formatter: turns structured DailyDigestData into a WhatsApp markdown message.
     */
    public static formatWhatsAppDigest(data: DailyDigestData): string {
        const { targetDate, dayName, dateFormatted, isWeekend, effectiveWeek, schedule, piket, tasks, notes } = data;
        const roomInfo = schedule.length > 0 && schedule[0].room ? ` (Ruang: ${schedule[0].room})` : "";
        const rangeText = effectiveWeek.dateRangeStr ? ` ${effectiveWeek.dateRangeStr}` : "";

        const scheduleTitle = isWeekend
            ? `Jadwal Pelajaran${rangeText} (Minggu ke-${effectiveWeek.weekNumber})${roomInfo}`
            : `Jadwal untuk ${dayName}, ${dateFormatted}${roomInfo}`;

        const lines: string[] = [];
        lines.push(`Assalamualaikum wr wb.`);
        lines.push(`✨ *${scheduleTitle}* ✨`);

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
        if (isWeekend) {
            lines.push(`_Libur akhir pekan (Tidak ada piket)._`);
        } else if (piket.length === 0) {
            lines.push(`_Belum ada jadwal piket yang diatur._`);
        } else {
            piket.forEach((student, idx) => {
                lines.push(`${idx + 1}. ${student}`);
            });
        }

        lines.push(``);
        lines.push(`📚 *PR / Tugas Aktif* =`);
        if (tasks.length === 0) {
            lines.push(`_Tidak ada PR aktif (Alhamdulillah!)_`);
        } else {
            tasks.forEach((t, idx) => {
                const d = new Date(t.deadline);
                const deadlineStr = `${d.getDate()} ${ID_MONTHS[d.getMonth()]}`;
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

    /**
     * Generate clean WhatsApp formatted reminder message for a given date (usually tomorrow).
     * Backwards-compatible convenience wrapper around getDailyDigestData and formatWhatsAppDigest.
     */
    public static async generateDailyDigest(targetDate: Date, className: string = "RPL A"): Promise<string> {
        const data = await this.getDailyDigestData(targetDate, className);
        return this.formatWhatsAppDigest(data);
    }
}
