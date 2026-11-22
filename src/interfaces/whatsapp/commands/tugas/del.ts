import { Command, CommandContext } from "../../types.js";
import { TaskService } from "../../../../core/services/task.service.js";

export const command: Command = {
    name: "del",
    aliases: ["hapus"],
    category: "tugas",
    description: "Hapus tugas (.del <id>)",
    execute: async (ctx: CommandContext) => {
        const id = parseInt(ctx.args[0], 10);
        if (isNaN(id)) {
            await ctx.reply(`⚠️ Masukkan ID tugas yang ingin dihapus. Contoh: *.del 1*`);
            return;
        }

        try {
            await TaskService.deleteTask(id);
            await ctx.reply(`🗑️ *Tugas #${id} berhasil dihapus.*`);
        } catch {
            await ctx.reply(`❌ Tugas dengan ID #${id} tidak ditemukan.`);
        }
    },
};
export default command;
