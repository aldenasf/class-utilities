import cron, { ScheduledTask } from 'node-cron';
import { ReminderService } from '../core/services/reminder.service.js';
import { WhatsAppBot } from '../interfaces/whatsapp/client.js';
import { prisma } from '../core/db.js';

export class SchedulerEngine {
  private static task: ScheduledTask | null = null;

  public static async init() {
    const timeSetting = await prisma.setting.findUnique({ where: { key: 'reminder_time' } });
    const reminderTime = timeSetting?.value || process.env.REMINDER_TIME || '18:30';
    const [hour, minute] = reminderTime.split(':').map(v => parseInt(v, 10));

    const cronExpr = `${minute || 30} ${hour || 18} * * *`;
    console.log(`⏰ Scheduler initialized: Daily reminder set for ${reminderTime} WIB (Cron: ${cronExpr})`);

    if (this.task) {
      this.task.stop();
    }

    this.task = cron.schedule(
      cronExpr,
      async () => {
        await this.triggerDailyDigest();
      },
      {
        timezone: 'Asia/Jakarta',
      }
    );
  }

  public static async triggerDailyDigest() {
    console.log(`[Scheduler] Executing daily digest trigger...`);

    const enabledSetting = await prisma.setting.findUnique({ where: { key: 'reminder_enabled' } });
    if (enabledSetting && enabledSetting.value === 'false') {
      console.log(`[Scheduler] Daily digest skipped: reminder is disabled in settings.`);
      return;
    }

    const groupSetting = await prisma.setting.findUnique({ where: { key: 'class_group_jid' } });
    const targetJid = groupSetting?.value || process.env.CLASS_GROUP_JID;

    if (!targetJid) {
      console.log(`[Scheduler] No target class group JID found. Daily digest not dispatched.`);
      return;
    }

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const message = await ReminderService.generateDailyDigest(tomorrow);
    await WhatsAppBot.sendMessage(targetJid, message);
    console.log(`[Scheduler] Daily digest dispatched to ${targetJid} successfully.`);
  }
}
