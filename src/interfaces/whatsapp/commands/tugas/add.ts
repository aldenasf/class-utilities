import { Command, CommandContext } from "../../types.js";
import { TaskService } from "../../../../core/services/task.service.js";

export const command: Command = {
    name: "add",
    aliases: ["tugas-add", "tambah"],
    category: "tugas",
    description: "Tambah tugas baru (.add <deadline: DD-MM atau MM-DD> <deskripsi>)",
    execute: async (ctx: CommandContext) => {
        if (ctx.args.length < 2) {
            await ctx.reply(
                `⚠️ *Format salah!*\nContoh penggunaan:\n.add 18-10 MP Data Analyst Jobsheet 5\natau:\n.add 2026-10-18 Tugas Matematika`
            );
            return;
        }

        const deadlineRaw = ctx.args[0];
        const description = ctx.args.slice(1).join(" ");

        // Parse date: support DD-MM, MM-DD, YYYY-MM-DD
        let deadline: Date;
        const now = new Date();
        const parts = deadlineRaw.split(/[-/]/);

        if (parts.length === 2) {
            const p1 = parseInt(parts[0], 10);
            const p2 = parseInt(parts[1], 10);
            // Assume DD-MM if p1 > 12, else check
            const day = p1 > 12 ? p1 : p2 > 12 ? p2 : p1;
            const month = (p1 > 12 ? p2 : p2 > 12 ? p1 : p2) - 1;
            deadline = new Date(now.getFullYear(), month, day, 23, 59, 59);
        } else if (parts.length === 3) {
            if (parts[0].length === 4) {
                deadline = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59);
            } else {
                deadline = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 23, 59);
            }
        } else {
            await ctx.reply(`⚠️ Format tanggal tidak dikenali. Gunakan format misal: *18-10* atau *2026-10-18*.`);
            return;
        }

        const task = await TaskService.addTask(description, deadline, ctx.sender);
        const dateFormatted = `${deadline.getDate()}/${deadline.getMonth() + 1}/${deadline.getFullYear()}`;

        await ctx.reply(
            `✅ *Tugas Berhasil Ditambahkan!*\nID: #${task.id}\nDeskripsi: *${task.description}*\nDeadline: *${dateFormatted}*`
        );
    },
};
export default command;
