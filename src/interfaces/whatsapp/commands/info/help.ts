import { Command, CommandContext } from "../../types.js";
import { CommandRegistry } from "../../command-loader.js";

export const command: Command = {
    name: "help",
    aliases: ["menu"],
    category: "info",
    description: "Tampilkan daftar semua perintah bot",
    execute: async (ctx: CommandContext) => {
        const all = CommandRegistry.getAllCommands();
        const categories: Record<string, Command[]> = {};

        for (const cmd of all) {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(cmd);
        }

        const lines: string[] = [`🤖 *Menu Perintah Utility Kelas:*`];

        for (const [cat, cmds] of Object.entries(categories)) {
            lines.push(`\n📂 *Kategori: ${cat.toUpperCase()}*`);
            cmds.forEach((c) => {
                lines.push(`• *.${c.name}* : ${c.description}`);
            });
        }

        lines.push(`\n_Gunakan tanda titik (.) di awal perintah._`);
        await ctx.reply(lines.join("\n"));
    },
};
export default command;
