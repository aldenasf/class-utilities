import { prisma } from "../db.js";
import { ParsedScheduleResult } from "../excel/types.js";

export interface ResolvedLessonSlot {
    slotNumber: number;
    code: string;
    subjectName: string;
    teacherName?: string;
    room?: string;
    isOverride?: boolean;
}

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
            // Create mock dates if none present
            const now = new Date();
            await prisma.semesterWeek.upsert({
                where: { weekNumber: w.weekNumber },
                update: {
                    eventNote: w.eventNote,
                },
                create: {
                    weekNumber: w.weekNumber,
                    startDate: w.startDate || now,
                    endDate: w.endDate || now,
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
     * Get schedule for a specific week and slot/day
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
            return {
                slotNumber: s.slotNumber,
                code: s.code,
                subjectName: t ? t.subjectName : s.code,
                teacherName: t ? t.teacherName : undefined,
                room: s.room || undefined,
                isOverride: false,
            };
        });
    }

    /**
     * Get schedule for tomorrow or a specific date
     */
    public static async getScheduleForDate(date: Date, className: string = "RPL A") {
        // 1. Check for overrides on this specific date (normalized to YYYY-MM-DD)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const overrides = await prisma.scheduleOverride.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
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

        // 2. Fallback to active semester week setting
        const currentWeekSetting = await prisma.setting.findUnique({
            where: { key: "current_week" },
        });

        const weekNumber = currentWeekSetting ? parseInt(currentWeekSetting.value, 10) : 4; // Default to week 4
        return this.getScheduleForWeek(weekNumber, className);
    }
}
