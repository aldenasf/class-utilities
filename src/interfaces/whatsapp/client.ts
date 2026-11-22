import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { CommandRegistry } from './command-loader.js';
import { CommandContext } from './types.js';
import { prisma } from '../../core/db.js';

export class WhatsAppBot {
  private static socket: WASocket | null = null;
  private static authDir = path.resolve(process.cwd(), 'data', 'auth');
  private static prefix = '.';
  private static currentQr: string | null = null;
  private static currentQrDataUrl: string | null = null;
  private static connected: boolean = false;

  public static async start(): Promise<WASocket> {
    await CommandRegistry.loadCommands();

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }) as any,
    });

    this.socket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentQr = qr;
        try {
          this.currentQrDataUrl = await QRCode.toDataURL(qr);
        } catch (e) {
          console.error('[WA] Error generating QR DataURL:', e);
        }

        console.log('[WA] Scan the following QR code with WhatsApp (Linked Devices):');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('[WA] Visual QR code also available on Web Dashboard: http://localhost:3000');
      }

      if (connection === 'close') {
        this.connected = false;
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[WA] Connection closed. Reconnecting: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => this.start(), 3000);
        }
      } else if (connection === 'open') {
        this.connected = true;
        this.currentQr = null;
        this.currentQrDataUrl = null;
        console.log('[WA] Bot connected successfully');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid || '';
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? (msg.key.participant || '') : from;

        // Save class group JID automatically when active in group
        if (isGroup) {
          await prisma.setting.upsert({
            where: { key: 'class_group_jid' },
            update: { value: from },
            create: { key: 'class_group_jid', value: from },
          });
        }

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';

        if (!text.startsWith(this.prefix)) continue;

        const rawArgs = text.slice(this.prefix.length).trim().split(/\s+/);
        const commandName = rawArgs[0];
        const args = rawArgs.slice(1);

        const command = CommandRegistry.getCommand(commandName);
        if (command) {
          const ctx: CommandContext = {
            client: sock,
            msg,
            from,
            sender,
            isGroup,
            args,
            commandText: text,
            reply: async (replyText: string) => {
              await sock.sendMessage(from, { text: replyText }, { quoted: msg });
            },
          };

          try {
            await command.execute(ctx);
          } catch (err) {
            console.error(`[WA] Error executing command .${commandName}:`, err);
            await ctx.reply(`❌ Terjadi kesalahan saat memproses perintah.`);
          }
        }
      }
    });

    return sock;
  }

  public static getSocket(): WASocket | null {
    return this.socket;
  }

  public static isConnected(): boolean {
    return this.connected;
  }

  public static getQrDataUrl(): string | null {
    return this.currentQrDataUrl;
  }

  public static async sendMessage(to: string, text: string) {
    if (this.socket) {
      await this.socket.sendMessage(to, { text });
    }
  }
}
