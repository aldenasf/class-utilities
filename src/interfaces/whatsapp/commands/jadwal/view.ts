import { Command, CommandContext } from "../../types.js";
import { ScheduleService } from "../../../../core/services/index.js";

export const command: Command = {
    name: "jadwal",
    aliases: ["besok", "pelajaran"],
    category: "jadwal",
    description: "Tampilkan jadwal pelajaran blok mingguan",
    execute: async (ctx: CommandContext) => {
        const today = new Date();
        const arg = ctx.args[0]?.toLowerCase();

        let weekNumber: number;
        let dateRange: string | null = null;

        const argWeek = parseInt(arg, 10);
        if (!isNaN(argWeek) && argWeek > 0 && argWeek <= 25) {
            weekNumber = argWeek;
            dateRange = await ScheduleService.getWeekDateRangeStr(weekNumber);
        } else {
            const effective = await ScheduleService.getEffectiveWeekNumber(today);
            weekNumber = effective.weekNumber;
            dateRange = effective.dateRangeStr;
        }

        const schedule = await ScheduleService.getScheduleForWeek(weekNumber);
        const rangeText = dateRange ? ` ${dateRange}` : "";
        const title = `Jadwal Pelajaran${rangeText} (Minggu ke-${weekNumber})`;

        if (schedule.length === 0) {
            await ctx.reply(`✨ *${title}*\n_Tidak ada data jadwal untuk minggu ini._`);
            return;
        }

        const room = schedule[0]?.room ? ` (Ruang: ${schedule[0].room})` : "";
        const lines = [`✨ *${title}${room}* ✨`];

        schedule.forEach((s, idx) => {
            const teacher = s.teacherName ? ` (${s.teacherName})` : "";
            lines.push(`${idx + 1}. *${s.subjectName}*${teacher}`);
        });

        await ctx.reply(lines.join("\n"));
    },
};
export default command;
