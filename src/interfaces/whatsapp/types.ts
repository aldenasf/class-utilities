import type { WASocket, proto } from "@whiskeysockets/baileys";

export interface CommandContext {
    client: WASocket;
    msg: proto.IWebMessageInfo;
    from: string;
    sender: string;
    isGroup: boolean;
    args: string[];
    commandText: string;
    reply: (text: string) => Promise<void>;
}

export interface Command {
    name: string;
    aliases?: string[];
    category: string;
    description: string;
    permission?: undefined | "admin" | "superuser";
    execute: (ctx: CommandContext) => Promise<void>;
}
