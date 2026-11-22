import { Command, CommandContext } from "../../types.js";
import { CommandRegistry } from "../../command-loader.js";

export const command: Command = {
    name: "ping",
    description: "Ping",
    category: "info",
    permission: "admin",
    execute: async (ctx: CommandContext) => {
        const response = [`from: ${ctx.from}`, `sender: ${ctx.sender}`].join("\n");

        await ctx.reply(response);
    },
};

export default command;
