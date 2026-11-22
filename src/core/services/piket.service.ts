import { prisma } from "../db.js";

export class PiketService {
    /**
     * Get piket students for a specific day of week (1: Senin .. 5: Jumat)
     */
    public static async getPiketForDay(dayOfWeek: number): Promise<string[]> {
        if (dayOfWeek < 1 || dayOfWeek > 5) {
            return [];
        }
        const list = await prisma.piket.findMany({
            where: { dayOfWeek },
            orderBy: { id: "asc" },
        });
        return list.map((p) => p.studentName);
    }

    /**
     * Set piket students for a day of week
     */
    public static async setPiketForDay(dayOfWeek: number, studentNames: string[]) {
        await prisma.piket.deleteMany({ where: { dayOfWeek } });
        if (studentNames.length > 0) {
            await prisma.piket.createMany({
                data: studentNames.map((name) => ({
                    dayOfWeek,
                    studentName: name.trim(),
                })),
            });
        }
    }
}
