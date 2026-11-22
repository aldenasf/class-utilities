import type { Task, Note } from "@prisma/client";

export interface ResolvedLessonSlot {
    slotNumber: number;
    code: string;
    subjectName: string;
    teacherName?: string;
    room?: string;
    isOverride?: boolean;
}

export interface EffectiveWeekInfo {
    weekNumber: number;
    isNextWeek: boolean;
    dateRangeStr: string | null;
}

export interface DailyDigestData {
    targetDate: Date;
    dayName: string;
    dateFormatted: string;
    isWeekend: boolean;
    effectiveWeek: EffectiveWeekInfo;
    schedule: ResolvedLessonSlot[];
    piket: string[];
    tasks: Task[];
    notes: Note[];
}
