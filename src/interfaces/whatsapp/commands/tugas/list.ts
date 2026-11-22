import { Command, CommandContext } from "../../types.js";
import { TaskService } from "../../../../core/services/task.service.js";

export const command: Command = {
    name: "list",
    aliases: ["tugas", "pr"],
    category: "tugas",
    description: "Tampilkan semua daftar tugas aktif",
    execute: async (ctx: CommandContext) => {
        const tasks = await TaskService.getActiveTasks();

        if (tasks.length === 0) {
            await ctx.reply(`📚 *Daftar Tugas / PR Kelas:*\n_Tidak ada tugas aktif. Semua tugas beres! 🎉_`);
            return;
        }

        const lines: string[] = [`📚 *Daftar Tugas / PR Aktif:*`];
        tasks.forEach((t) => {
            const d = new Date(t.deadline);
            const dl = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
            lines.push(`- [#${t.id}] *${t.description}* (Deadline: ${dl})`);
        });

        lines.push(`\nKetik *.done <id>* untuk menandai tugas selesai.`);
        await ctx.reply(lines.join("\n"));
    },
};
export default command;
