import { Command, CommandContext } from "../../types.js";
import { ScheduleService } from "../../../../core/services/schedule.service.js";

export const command: Command = {
    name: "jadwal",
    aliases: ["besok", "pelajaran"],
    category: "jadwal",
    description: "Tampilkan jadwal pelajaran blok untuk hari esok / hari ini",
    execute: async (ctx: CommandContext) => {
        const isToday = ctx.args[0]?.toLowerCase() === "hari-ini";
        const targetDate = new Date();
        if (!isToday) {
            targetDate.setDate(targetDate.getDate() + 1); // Default to tomorrow
        }

        const schedule = await ScheduleService.getScheduleForDate(targetDate);
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const title = isToday ? "Hari Ini" : "Besok";

        if (schedule.length === 0) {
            await ctx.reply(
                `✨ *Jadwal Pelajaran ${title} (${dayNames[targetDate.getDay()]})*\n_Tidak ada jadwal KBM / Libur._`
            );
            return;
        }

        const room = schedule[0]?.room ? ` (Ruang: ${schedule[0].room})` : "";
        const lines = [
            `✨ *Jadwal Pelajaran ${title} (${dayNames[targetDate.getDay()]})${room}* ✨`,
        ];

        schedule.forEach((s, idx) => {
            const teacher = s.teacherName ? ` (${s.teacherName})` : "";
            lines.push(`${idx + 1}. *${s.subjectName}*${teacher}`);
        });

        await ctx.reply(lines.join("\n"));
    },
};
export default command;
