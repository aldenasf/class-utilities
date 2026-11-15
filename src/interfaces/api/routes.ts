import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../core/db.js';
import { TaskService } from '../../core/services/task.service.js';
import { ScheduleService } from '../../core/services/schedule.service.js';
import { PiketService } from '../../core/services/piket.service.js';
import { ReminderService } from '../../core/services/reminder.service.js';
import { BlockScheduleParser } from '../../core/excel/parser.js';
import { SchedulerEngine } from '../../scheduler/index.js';
import { WhatsAppBot } from '../whatsapp/client.js';
import path from 'path';

export const apiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Helper to check admin pin
  const verifyPin = async (providedPin?: string) => {
    const pinSetting = await prisma.setting.findUnique({ where: { key: 'admin_pin' } });
    const realPin = pinSetting?.value || process.env.ADMIN_PIN || '1234';
    return providedPin === realPin;
  };

  // Auth Hook for modifying routes
  server.addHook('preHandler', async (req, reply) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const pin = req.headers['x-admin-pin'] as string;
      // Allow trigger/parse without strict check if in dev, but verify for edits
      if (req.url.startsWith('/api/') && !req.url.includes('/status')) {
        const isValid = await verifyPin(pin);
        if (!isValid) {
          reply.status(401).send({ error: 'PIN Admin salah atau belum dimasukkan.' });
        }
      }
    }
  });

  // GET Status Overview
  server.get('/api/status', async () => {
    const activeTasks = await prisma.task.count({ where: { isCompleted: false } });
    const weekSetting = await prisma.setting.findUnique({ where: { key: 'current_week' } });
    const currentWeek = weekSetting ? parseInt(weekSetting.value, 10) : 4;
    const isWhatsAppReady = WhatsAppBot.isConnected();
    const qrCodeUrl = WhatsAppBot.getQrDataUrl();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowPreview = await ReminderService.generateDailyDigest(tomorrow);

    return {
      whatsappReady: isWhatsAppReady,
      qrCodeUrl,
      currentWeek,
      activeTasksCount: activeTasks,
      tomorrowPreview,
    };
  });

  // Tasks API
  server.get('/api/tasks', async () => {
    return prisma.task.findMany({ orderBy: { deadline: 'asc' } });
  });

  server.post('/api/tasks', async (req) => {
    const { description, deadline, createdBy } = req.body as any;
    return TaskService.addTask(description, new Date(deadline), createdBy || 'Web Admin');
  });

  server.patch('/api/tasks/:id/toggle', async (req) => {
    const { id } = req.params as any;
    const task = await prisma.task.findUnique({ where: { id: parseInt(id, 10) } });
    if (!task) throw new Error('Task tidak ditemukan');
    return prisma.task.update({
      where: { id: parseInt(id, 10) },
      data: { isCompleted: !task.isCompleted },
    });
  });

  server.delete('/api/tasks/:id', async (req) => {
    const { id } = req.params as any;
    return TaskService.deleteTask(parseInt(id, 10));
  });

  // Schedule API
  server.get('/api/schedule/weeks', async () => {
    return prisma.semesterWeek.findMany({ orderBy: { weekNumber: 'asc' } });
  });

  server.get('/api/schedule/week/:weekNumber', async (req) => {
    const { weekNumber } = req.params as any;
    return ScheduleService.getScheduleForWeek(parseInt(weekNumber, 10));
  });

  server.get('/api/schedule/teachers', async () => {
    return prisma.subjectTeacher.findMany({ orderBy: { code: 'asc' } });
  });

  server.post('/api/schedule/override', async (req) => {
    const { date, slotNumber, subjectName, teacherName, room, note } = req.body as any;
    return prisma.scheduleOverride.create({
      data: {
        date: new Date(date),
        slotNumber: parseInt(slotNumber, 10),
        subjectName,
        teacherName,
        room,
        note,
      },
    });
  });

  // Piket API
  server.get('/api/piket', async () => {
    const result: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (let day = 1; day <= 5; day++) {
      result[day] = await PiketService.getPiketForDay(day);
    }
    return result;
  });

  server.post('/api/piket', async (req) => {
    const { dayOfWeek, students } = req.body as any;
    await PiketService.setPiketForDay(parseInt(dayOfWeek, 10), students);
    return { success: true };
  });

  // Settings API
  server.get('/api/settings', async () => {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => (map[s.key] = s.value));
    return map;
  });

  server.post('/api/settings', async (req) => {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    if (updates['reminder_time']) {
      await SchedulerEngine.init();
    }

    return { success: true };
  });

  // Manual Trigger Reminder
  server.post('/api/reminder/trigger', async () => {
    await SchedulerEngine.triggerDailyDigest();
    return { success: true, message: 'Pengingat harian berhasil dikirim ke grup WhatsApp!' };
  });

  // Excel Parser & Sync
  server.post('/api/excel/parse', async (req) => {
    const { className = 'RPL A', weekRow = 8, slotRow = 9, dateRow = 33 } = (req.body as any) || {};
    const defaultExcelPath = path.resolve(process.cwd(), 'MASTER BLOK GANJIL 2026-2027 KELAS XI-2.xlsx');

    const parsed = BlockScheduleParser.parse({
      filePath: defaultExcelPath,
      targetClassName: className,
      weekRow: parseInt(weekRow, 10),
      slotRow: parseInt(slotRow, 10),
      dateRow: parseInt(dateRow, 10),
    });

    return parsed;
  });

  server.post('/api/excel/sync', async (req) => {
    const parsedData = req.body as any;
    const result = await ScheduleService.syncFromParsedExcel(parsedData);
    return { success: true, result };
  });
};
