import { BlockScheduleParser } from "../src/core/excel/parser.js";
import { ScheduleService, PiketService, TaskService, ReminderService } from "../src/core/services/index.js";
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
    console.log(`✅ Synced to DB: ${syncResult.teachersCount} guru, ${syncResult.scheduleCount} slot jadwal.`);

    // 2. Set current week = 4
    await prisma.setting.upsert({
        where: { key: "current_week" },
        update: { value: "4" },
        create: { key: "current_week", value: "4" },
    });

    // 3. Seed sample piket for Monday (dayOfWeek = 1)
    await PiketService.setPiketForDay(1, ["Adam D", "Adam M", "Fadil", "Aidil", "Akhtar", "Alden", "Alfian", "Alvin"]);
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

    // 6. Test date-based schedule resolution and reminders
    const sundayDate = new Date(2026, 10, 22); // Sunday
    const mondayDate = new Date(2026, 10, 23); // Monday (Week 20)
    const week4Date = new Date(2026, 7, 4); // Tuesday (Week 4)

    console.log(`--- TEST 1: HARI MINGGU 22 NOV (AKHIR PEKAN) ---`);
    const sundayDigest = await ReminderService.generateDailyDigest(sundayDate, "RPL A");
    console.log(sundayDigest);
    console.log(`\n---------------------------------------\n`);

    console.log(`--- TEST 2: HARI SENIN 23 NOV (WEEK 20 - BENGKEL) ---`);
    const mondayDigest = await ReminderService.generateDailyDigest(mondayDate, "RPL A");
    console.log(mondayDigest);
    console.log(`\n---------------------------------------\n`);

    console.log(`--- TEST 3: WEEK 4 TEORI (RUANG 2) ---`);
    const week4Digest = await ReminderService.generateDailyDigest(week4Date, "RPL A");
    console.log(week4Digest);
    console.log(`\n---------------------------------------\n`);

    await prisma.$disconnect();
}

testServices().catch(console.error);
