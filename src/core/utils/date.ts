export const ID_MONTHS = [
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
] as const;

export const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

/**
 * Checks if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date = new Date()): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/**
 * Normalizes a date to start (00:00:00.000) and end (23:59:59.999) of day
 */
export function getDayBounds(date: Date): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
}

/**
 * Formats a single Date to Indonesian date string: "23 November 2026"
 */
export function formatIndonesianDate(date: Date, includeYear = true): string {
    const day = date.getDate();
    const month = ID_MONTHS[date.getMonth()];
    return includeYear ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
}

/**
 * Formats academic week date range string (Monday to Friday),
 * e.g. "23-27 November" or "30 November - 4 Desember"
 */
export function formatAcademicDateRange(mondayDate: Date): string {
    const start = new Date(mondayDate);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);

    if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}-${end.getDate()} ${ID_MONTHS[start.getMonth()]}`;
    }
    return `${start.getDate()} ${ID_MONTHS[start.getMonth()]} - ${end.getDate()} ${ID_MONTHS[end.getMonth()]}`;
}
