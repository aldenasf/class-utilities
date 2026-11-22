import { Command, CommandContext } from "../../types.js";
import { prisma } from "../../../../core/db.js";

export const command: Command = {
    name: "nb",
    aliases: ["catatan", "note"],
    category: "info",
    description: "Tambah catatan penting baru (.nb <catatan>)",
    execute: async (ctx: CommandContext) => {
        if (ctx.args.length === 0) {
            const notes = await prisma.note.findMany({ where: { isActive: true } });
            if (notes.length === 0) {
                await ctx.reply(`📝 *Catatan Tambahan (NB):*\n_Belum ada catatan aktif._`);
                return;
            }
            const lines = [`📝 *Catatan Tambahan (NB) Aktif:*`];
            notes.forEach((n, idx) => lines.push(`${idx + 1}. ${n.text}`));
            await ctx.reply(lines.join("\n"));
            return;
        }

        const text = ctx.args.join(" ");
        await prisma.note.create({ data: { text } });
        await ctx.reply(`✅ *Catatan baru ditambahkan:*\n"${text}"`);
    },
};
export default command;
