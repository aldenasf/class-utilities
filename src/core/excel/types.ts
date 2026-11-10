export interface SubjectTeacherInfo {
  code: string;
  subjectName: string;
  teacherName: string;
}

export interface ParsedBlockSlot {
  weekNumber: number;
  slotNumber: number; // 1 s/d 5
  code: string;
  room?: string;
}

export interface ParsedWeekDate {
  weekNumber: number;
  dateRangeStr: string;
  startDate?: Date;
  endDate?: Date;
  eventNote?: string;
}

export interface ParseExcelOptions {
  filePath: string;
  masterSheetName?: string;
  teacherSheetName?: string;
  targetClassName?: string;
  weekRow?: number;      // Default 8
  slotRow?: number;      // Default 9
  dateRow?: number;      // Default 33
}

export interface ParsedScheduleResult {
  className: string;
  teachers: SubjectTeacherInfo[];
  schedule: ParsedBlockSlot[];
  weeks: ParsedWeekDate[];
}
