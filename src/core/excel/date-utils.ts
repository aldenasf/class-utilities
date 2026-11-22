const INDO_MONTHS: Record<string, number> = {
    jan: 0,
    januari: 0,
    feb: 1,
    februari: 1,
    mar: 2,
    maret: 2,
    apr: 3,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    juni: 5,
    jul: 6,
    juli: 6,
    agu: 7,
    ags: 7,
    agustus: 7,
    sep: 8,
    sept: 8,
    september: 8,
    okt: 9,
    oktober: 9,
    nop: 10,
    nopember: 10,
    nov: 10,
    november: 10,
    des: 11,
    desember: 11,
};

/**
 * Parse Indonesian date range strings found in school schedules, e.g.:
 * "13 s/d 17 Juli 2026", "23 s/d 27 Nopember 2026", "30 Nopember s/d 4 Desember 2026"
 * Spans Monday 00:00:00 through Sunday 23:59:59 (7 full days) for the week.
 */
export function parseIndonesianDateRange(
    str: string,
    defaultYear = 2026
): { startDate: Date; endDate: Date } | null {
    if (!str) return null;
    const parts = str.toLowerCase().split(/\s+(?:s\/d|-)\s+/i);
    if (parts.length !== 2) return null;

    const endTokens = parts[1].trim().split(/\s+/);
    const endDay = parseInt(endTokens[0], 10);
    const endMonthStr = endTokens[1];
    const endYear = endTokens[2] ? parseInt(endTokens[2], 10) : defaultYear;
    const endMonth = INDO_MONTHS[endMonthStr];
    if (isNaN(endDay) || endMonth === undefined) return null;

    const startTokens = parts[0].trim().split(/\s+/);
    const startDay = parseInt(startTokens[0], 10);
    const startMonth = startTokens[1] ? INDO_MONTHS[startTokens[1]] : endMonth;
    const startYear = startTokens[2] ? parseInt(startTokens[2], 10) : endYear;
    if (isNaN(startDay) || startMonth === undefined) return null;

    const startDate = new Date(startYear, startMonth, startDay, 0, 0, 0, 0);
    // Span through Sunday 23:59:59.999 (6 days after start Monday)
    const endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + 6,
        23,
        59,
        59,
        999
    );

    return { startDate, endDate };
}
