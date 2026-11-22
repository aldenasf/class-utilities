import XLSX from "xlsx";
import {
    ParseExcelOptions,
    ParsedScheduleResult,
    SubjectTeacherInfo,
    ParsedBlockSlot,
    ParsedWeekDate,
} from "./types.js";

/**
 * Standalone parser for SMKN 1 Jenangan Block Schedule Excel format.
 */
export class BlockScheduleParser {
    /**
     * Parse the Excel workbook and return structured schedule, teachers, and weeks.
     */
    public static parse(options: ParseExcelOptions): ParsedScheduleResult {
        const {
            filePath,
            masterSheetName = "DRAF MASTER GANJIL  ",
            teacherSheetName = "daftar nama guru",
            targetClassName = "RPL A",
            weekRow = 8,
            slotRow = 9,
            dateRow = 33,
        } = options;

        const workbook = XLSX.readFile(filePath);

        // 1. Parse Teachers & Subject Codes
        const teachers = this.parseTeachers(workbook, teacherSheetName);

        // 2. Parse Master Block Schedule
        const { schedule, weeks } = this.parseMasterSheet(workbook, {
            masterSheetName,
            targetClassName,
            weekRow,
            slotRow,
            dateRow,
        });

        return {
            className: targetClassName,
            teachers,
            schedule,
            weeks,
        };
    }

    /**
     * Parse the 'daftar nama guru' sheet.
     */
    private static parseTeachers(workbook: XLSX.WorkBook, sheetName: string): SubjectTeacherInfo[] {
        const sheet = workbook.Sheets[sheetName] || Object.values(workbook.Sheets)[0];
        if (!sheet) return [];

        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:H100");
        const teachers: SubjectTeacherInfo[] = [];

        for (let r = 4; r <= range.e.r; r++) {
            // Row index 4 is Excel row 5
            const codeCell = sheet[XLSX.utils.encode_cell({ r, c: 2 })]; // Column C (KODE)
            const nameCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })]; // Column B (NAMA GURU)
            const subjectCell = sheet[XLSX.utils.encode_cell({ r, c: 3 })]; // Column D (MAPEL)

            const code = codeCell ? String(codeCell.v).trim() : "";
            const name = nameCell ? String(nameCell.v).trim() : "";
            const subject = subjectCell ? String(subjectCell.v).trim() : "";

            if (code && (name || subject)) {
                teachers.push({
                    code,
                    teacherName: name,
                    subjectName: subject || code,
                });
            }
        }

        return teachers;
    }

    /**
     * Parse the master block sheet ('DRAF MASTER GANJIL  ').
     */
    private static parseMasterSheet(
        workbook: XLSX.WorkBook,
        cfg: {
            masterSheetName: string;
            targetClassName: string;
            weekRow: number;
            slotRow: number;
            dateRow: number;
        }
    ): { schedule: ParsedBlockSlot[]; weeks: ParsedWeekDate[] } {
        // Look for matching sheet name (handling trailing spaces)
        const availableSheets = workbook.SheetNames;
        const actualSheetName =
            availableSheets.find((s) => s.trim() === cfg.masterSheetName.trim()) ||
            availableSheets[0];
        const sheet = workbook.Sheets[actualSheetName];
        if (!sheet) return { schedule: [], weeks: [] };

        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:ZZ100");
        const merges = sheet["!merges"] || [];

        // Find target class row index in Column B (c = 1)
        let classRowIndex = -1;
        for (let r = 0; r <= range.e.r; r++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
            if (
                cell &&
                String(cell.v).trim().toUpperCase() === cfg.targetClassName.trim().toUpperCase()
            ) {
                classRowIndex = r;
                break;
            }
        }

        if (classRowIndex === -1) {
            throw new Error(
                `Kelas "${cfg.targetClassName}" tidak ditemukan pada kolom B di sheet "${actualSheetName}".`
            );
        }

        const schedule: ParsedBlockSlot[] = [];
        const weeks: ParsedWeekDate[] = [];

        // Helper to get effective cell value accounting for merges
        const getCellValue = (r: number, c: number): string => {
            // Check if this cell is inside any merge range
            for (const m of merges) {
                if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
                    const originCell = sheet[XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })];
                    return originCell && originCell.v !== undefined
                        ? String(originCell.v).trim()
                        : "";
                }
            }
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            return cell && cell.v !== undefined ? String(cell.v).trim() : "";
        };

        // Helper to get raw cell value directly without merge origin
        const getRawCellValue = (r: number, c: number): string => {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            return cell && cell.v !== undefined ? String(cell.v).trim() : "";
        };

        const weekRowIdx = cfg.weekRow - 1; // 0-based
        const slotRowIdx = cfg.slotRow - 1;
        const dateRowIdx = cfg.dateRow - 1;

        let currentWeek = 0;
        const weekStartCols: {
            week: number;
            col: number;
            isEvent?: boolean;
            eventNote?: string;
        }[] = [];

        // Scan columns starting from col C (c = 2)
        for (let c = 2; c <= range.e.c; c++) {
            const rawWeekVal = getRawCellValue(weekRowIdx, c);
            if (rawWeekVal) {
                const parsedWeek = parseInt(rawWeekVal, 10);
                if (!isNaN(parsedWeek)) {
                    currentWeek = parsedWeek;
                    weekStartCols.push({ week: currentWeek, col: c });
                }
            }

            // Check for special event columns in row 9 (slotRowIdx) like "ULANGAN PENILAIAN AKHIR", "CLASS MEETING", etc.
            const slotVal = getCellValue(slotRowIdx, c);
            if (slotVal && isNaN(Number(slotVal)) && slotVal !== "R" && slotVal.length > 5) {
                // It's a special multi-period event
                const existing = weekStartCols.find((w) => w.col === c);
                if (!existing) {
                    weekStartCols.push({
                        week: currentWeek > 0 ? currentWeek : 99,
                        col: c,
                        isEvent: true,
                        eventNote: slotVal,
                    });
                } else {
                    existing.isEvent = true;
                    existing.eventNote = slotVal;
                }
            }
        }

        // Process each identified week block
        // Each standard week block spans 6 columns: 5 slots + 1 room column
        for (let i = 0; i < weekStartCols.length; i++) {
            const wInfo = weekStartCols[i];
            const startCol = wInfo.col;

            // Read date range string from dateRow
            const dateStr = getCellValue(dateRowIdx, startCol);
            weeks.push({
                weekNumber: wInfo.week,
                dateRangeStr: dateStr,
                eventNote: wInfo.eventNote,
            });

            if (wInfo.isEvent) {
                // This whole week/slot is a special event
                continue;
            }

            // Read room column: usually 6th column (startCol + 5)
            const roomVal = getCellValue(classRowIndex, startCol + 5);

            // Read 5 lesson slots
            for (let s = 1; s <= 5; s++) {
                const slotCol = startCol + (s - 1);
                const code = getCellValue(classRowIndex, slotCol);

                if (code) {
                    schedule.push({
                        weekNumber: wInfo.week,
                        slotNumber: s,
                        code,
                        room: roomVal || undefined,
                    });
                }
            }
        }

        return { schedule, weeks };
    }
}
