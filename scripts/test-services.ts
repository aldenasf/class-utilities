import { BlockScheduleParser } from "../src/core/excel/parser.js";
import { ScheduleService } from "../src/core/services/schedule.service.js";
import { PiketService } from "../src/core/services/piket.service.js";
import { TaskService } from "../src/core/services/task.service.js";
import { ReminderService } from "../src/core/services/reminder.service.js";
import { prisma } from "../src/core/db.js";
import path from "path";

async function testServices() {
    console.log(`\n======================================================`);
    console.log(`🧪 Testing Core Services & Daily Digest Generation`);
    console.log(`======================================================\n`);

    // 1. Sync Excel to SQLite
    const excelFile = path.resolve(process.cwd(), "MASTER BLOK GANJIL 2026-2027 KELAS XI-2.xlsx");
    const parsed = BlockScheduleParser.parse({ filePath: excelFile, targetClassName: "RPL A" });
    const syncResult = await ScheduleService.syncFromParsedExcel(parsed);
    console.log(
        `✅ Synced to DB: ${syncResult.teachersCount} guru, ${syncResult.scheduleCount} slot jadwal.`
    );

    // 2. Set current week = 4
    await prisma.setting.upsert({
        where: { key: "current_week" },
        update: { value: "4" },
        create: { key: "current_week", value: "4" },
    });

    // 3. Seed sample piket for Monday (dayOfWeek = 1)
    await PiketService.setPiketForDay(1, [
        "Adam D",
        "Adam M",
        "Fadil",
        "Aidil",
        "Akhtar",
        "Alden",
        "Alfian",
        "Alvin",
    ]);
    console.log(`✅ Seeded Piket Senin.`);

    // 4. Seed sample tasks
    await TaskService.addTask("MP Data Analyst Jobsheet 5", new Date(2026, 9, 18), "Alden");
    console.log(`✅ Seeded Task.`);

    // 5. Seed sample notes
    await prisma.note.deleteMany({});
    await prisma.note.createMany({
        data: [
            { text: "Hari senin membawa topi abu putih" },
            { text: "Hari rabu membawa baju olahraga" },
            { text: "Hari kamis kas kelas Rp. 1.000" },
        ],
    });
    console.log(`✅ Seeded Notes.\n`);

    // 6. Generate Daily Digest for Monday
    const mondayDate = new Date(2026, 10, 17); // Sample date
    const digest = await ReminderService.generateDailyDigest(mondayDate, "RPL A");

    console.log(`--- PREVIEW PESAN WHATSAPP OTOMATIS ---\n`);
    console.log(digest);
    console.log(`\n---------------------------------------\n`);

    await prisma.$disconnect();
}

testServices().catch(console.error);
