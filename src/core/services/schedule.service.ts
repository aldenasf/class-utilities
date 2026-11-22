import { prisma } from "../db.js";
import { ParsedScheduleResult } from "../excel/types.js";
import type { ResolvedLessonSlot, EffectiveWeekInfo } from "./types.js";
import { getDayBounds, isWeekend, formatAcademicDateRange } from "../utils/date.js";

export type { ResolvedLessonSlot, EffectiveWeekInfo };

export class ScheduleService {
    /**
     * Save parsed Excel data into SQLite tables
     */
    public static async syncFromParsedExcel(data: ParsedScheduleResult) {
        // 1. Upsert SubjectTeacher
        for (const t of data.teachers) {
            await prisma.subjectTeacher.upsert({
                where: { code: t.code },
                update: {
                    subjectName: t.subjectName,
                    teacherName: t.teacherName,
                },
                create: {
                    code: t.code,
                    subjectName: t.subjectName,
                    teacherName: t.teacherName,
                },
            });
        }

        // 2. Clear old schedule for class and insert new
        await prisma.blockSchedule.deleteMany({
            where: { className: data.className },
        });

        for (const s of data.schedule) {
            await prisma.blockSchedule.create({
                data: {
                    className: data.className,
                    weekNumber: s.weekNumber,
                    slotNumber: s.slotNumber,
                    code: s.code,
                    room: s.room,
                },
            });
        }

        // 3. Save weeks
        for (const w of data.weeks) {
            const now = new Date();
            const startDate = w.startDate || now;
            const endDate = w.endDate || now;

            await prisma.semesterWeek.upsert({
                where: { weekNumber: w.weekNumber },
                update: {
                    startDate,
                    endDate,
                    eventNote: w.eventNote,
                },
                create: {
                    weekNumber: w.weekNumber,
                    startDate,
                    endDate,
                    eventNote: w.eventNote,
                },
            });
        }

        return {
            teachersCount: data.teachers.length,
            scheduleCount: data.schedule.length,
            weeksCount: data.weeks.length,
        };
    }

    /**
     * Get schedule for a specific week
     */
    public static async getScheduleForWeek(
        weekNumber: number,
        className: string = "RPL A"
    ): Promise<ResolvedLessonSlot[]> {
        const slots = await prisma.blockSchedule.findMany({
            where: { weekNumber, className },
            orderBy: { slotNumber: "asc" },
        });

        const teacherCodes = slots.map((s) => s.code);
        const teachers = await prisma.subjectTeacher.findMany({
            where: { code: { in: teacherCodes } },
        });

        const teacherMap = new Map(teachers.map((t) => [t.code, t]));

        return slots.map((s) => {
            const t = teacherMap.get(s.code);
            const isNumeric = /^\d+$/.test(s.code);
            let subjectName = t ? t.subjectName : s.code;
            let teacherName = t ? t.teacherName : undefined;

            if (isNumeric || s.room === "Bkl") {
                subjectName = `Praktik Kejuruan (Bengkel${isNumeric ? " " + s.code : ""})`;
                teacherName = teacherName || "Guru Produktif / Kejuruan";
            } else if (s.code === "MPLS") {
                subjectName = "Masa Pengenalan Lingkungan Sekolah (MPLS)";
            }

            return {
                slotNumber: s.slotNumber,
                code: s.code,
                subjectName,
                teacherName,
                room: s.room || undefined,
                isOverride: false,
            };
        });
    }

    /**
     * Resolve the week number for a specific calendar date
     */
    public static async resolveWeekNumber(date: Date): Promise<number> {
        const { startOfDay, endOfDay } = getDayBounds(date);

        const matchedWeek = await prisma.semesterWeek.findFirst({
            where: {
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay },
            },
        });

        if (matchedWeek) {
            return matchedWeek.weekNumber;
        }

        const currentWeekSetting = await prisma.setting.findUnique({
            where: { key: "current_week" },
        });
        return currentWeekSetting ? parseInt(currentWeekSetting.value, 10) : 4;
    }

    /**
     * Get the effective week number & metadata:
     * - If date is on a weekend (Saturday or Sunday): automatically targets NEXT week.
     * - If date is on a weekday (Monday - Friday): targets CURRENT week.
     */
    public static async getEffectiveWeekNumber(date: Date = new Date()): Promise<EffectiveWeekInfo> {
        let targetMonday: Date;
        let isNextWeek = false;

        if (isWeekend(date)) {
            // Target the upcoming Monday (Sunday -> +1 day, Saturday -> +2 days)
            const daysUntilMonday = date.getDay() === 0 ? 1 : 2;
            targetMonday = new Date(date);
            targetMonday.setDate(targetMonday.getDate() + daysUntilMonday);
            targetMonday.setHours(12, 0, 0, 0);
            isNextWeek = true;
        } else {
            targetMonday = date;
        }

        const weekNumber = await this.resolveWeekNumber(targetMonday);
        const dateRangeStr = await this.getWeekDateRangeStr(weekNumber);

        return {
            weekNumber,
            isNextWeek,
            dateRangeStr,
        };
    }

    /**
     * Format academic week date range string, e.g. "23-27 November" or "30 November - 4 Desember"
     */
    public static async getWeekDateRangeStr(weekNumber: number): Promise<string | null> {
        const weekInfo = await prisma.semesterWeek.findUnique({
            where: { weekNumber },
        });
        if (!weekInfo?.startDate) return null;

        return formatAcademicDateRange(weekInfo.startDate);
    }

    /**
     * Get schedule for tomorrow or a specific date
     */
    public static async getScheduleForDate(date: Date, className: string = "RPL A"): Promise<ResolvedLessonSlot[]> {
        // 1. Check for overrides on this specific date (normalized to YYYY-MM-DD)
        const { startOfDay, endOfDay } = getDayBounds(date);

        const overrides = await prisma.scheduleOverride.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: { slotNumber: "asc" },
        });

        if (overrides.length > 0) {
            return overrides.map((o) => ({
                slotNumber: o.slotNumber,
                code: "OVERRIDE",
                subjectName: o.subjectName,
                teacherName: o.teacherName || undefined,
                room: o.room || undefined,
                isOverride: true,
            }));
        }

        // 2. Resolve week number: automatically selects next week's schedule on weekends, current week on weekdays
        const { weekNumber } = await this.getEffectiveWeekNumber(date);
        return this.getScheduleForWeek(weekNumber, className);
    }
}
