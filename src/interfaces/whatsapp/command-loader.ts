import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Command } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CommandRegistry {
  private static commands = new Map<string, Command>();
  private static aliases = new Map<string, string>();

  public static async loadCommands(commandsDir: string = path.join(__dirname, 'commands')) {
    this.commands.clear();
    this.aliases.clear();

    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
      return;
    }

    const categories = fs.readdirSync(commandsDir, { withFileTypes: true });

    for (const cat of categories) {
      if (cat.isDirectory()) {
        const catPath = path.join(commandsDir, cat.name);
        const files = fs.readdirSync(catPath);

        for (const file of files) {
          if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
            const filePath = path.join(catPath, file);
            try {
              const fileUrl = pathToFileURL(filePath).href;
              const module = await import(fileUrl);
              const cmd: Command = module.default || module.command;

              if (cmd && cmd.name && typeof cmd.execute === 'function') {
                this.commands.set(cmd.name.toLowerCase(), cmd);
                if (cmd.aliases) {
                  for (const alias of cmd.aliases) {
                    this.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
                  }
                }
              }
            } catch (err) {
              console.error(`Gagal memuat command [${file}]:`, err);
            }
          }
        }
      }
    }

    console.log(`✅ Loaded ${this.commands.size} commands (${this.aliases.size} aliases) successfully.`);
  }

  public static getCommand(name: string): Command | undefined {
    const cleanName = name.toLowerCase();
    const resolvedName = this.aliases.get(cleanName) || cleanName;
    return this.commands.get(resolvedName);
  }

  public static getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}
