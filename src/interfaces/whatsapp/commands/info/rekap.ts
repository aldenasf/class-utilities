import { Command, CommandContext } from "../../types.js";
import { CommandRegistry } from "../../command-loader.js";
import { ReminderService } from "../../../../core/services/reminder.service.js";

export const command: Command = {
    name: "rekap",
    aliases: ["recap"],
    category: "info",
    description: "Kirim ringkasan informasi mingguan secara manual",
    permission: "admin",
    execute: async (ctx: CommandContext) => {
        const isToday = ctx.args[0]?.toLocaleLowerCase() === "now";
        const targetDate = new Date();

        if (!isToday) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const recap = await ReminderService.generateDailyDigest(targetDate);
        await ctx.reply(recap);
    },
};

export default command;
