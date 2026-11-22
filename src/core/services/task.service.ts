import { prisma } from "../db.js";

export class TaskService {
    public static async addTask(description: string, deadline: Date, createdBy?: string) {
        return prisma.task.create({
            data: {
                description,
                deadline,
                createdBy,
            },
        });
    }

    public static async getActiveTasks() {
        return prisma.task.findMany({
            where: { isCompleted: false },
            orderBy: { deadline: "asc" },
        });
    }

    public static async markTaskDone(id: number) {
        return prisma.task.update({
            where: { id },
            data: { isCompleted: true },
        });
    }

    public static async deleteTask(id: number) {
        return prisma.task.delete({
            where: { id },
        });
    }
}
