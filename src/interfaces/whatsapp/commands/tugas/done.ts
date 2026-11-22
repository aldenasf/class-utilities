import { Command, CommandContext } from "../../types.js";
import { TaskService } from "../../../../core/services/task.service.js";

export const command: Command = {
    name: "done",
    aliases: ["selesai"],
    category: "tugas",
    description: "Tandai tugas selesai (.done <id>)",
    execute: async (ctx: CommandContext) => {
        const id = parseInt(ctx.args[0], 10);
        if (isNaN(id)) {
            await ctx.reply(`⚠️ Masukkan ID tugas yang valid. Contoh: *.done 1*`);
            return;
        }

        try {
            const task = await TaskService.markTaskDone(id);
            await ctx.reply(`🎉 *Tugas #${task.id} selesai!* (${task.description})`);
        } catch {
            await ctx.reply(`❌ Tugas dengan ID #${id} tidak ditemukan.`);
        }
    },
};
export default command;
