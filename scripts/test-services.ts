import path from "path";
import fs from "fs";

async function testServices() {
    console.log(`\n======================================================`);
    console.log(`🧪 Testing Core Services & Daily Digest Generation`);
    console.log(`   (Isolated temporary test database)`);
    console.log(`======================================================\n`);

    const originalDbPath = path.resolve(process.cwd(), "data", "class.db");
    const testDbPath = path.resolve(process.cwd(), "data", "test.db");

    // Copy original DB structure to a temporary test DB
    if (fs.existsSync(originalDbPath)) {
        fs.copyFileSync(originalDbPath, testDbPath);
    }
    process.env.DATABASE_URL = `file:${testDbPath}`;

    // Dynamically import services so PrismaClient binds to the test database
    const { BlockScheduleParser } = await import("../src/core/excel/parser.js");
    const { ScheduleService, PiketService, TaskService, ReminderService } = await import(
        "../src/core/services/index.js"
    );
    const { prisma } = await import("../src/core/db.js");

    try {
        // 1. Sync Excel to test SQLite
        const excelFile = path.resolve(process.cwd(), "MASTER BLOK GANJIL 2026-2027 KELAS XI-2.xlsx");
        const parsed = BlockScheduleParser.parse({ filePath: excelFile, targetClassName: "RPL A" });
        const syncResult = await ScheduleService.syncFromParsedExcel(parsed);
        console.log(`[TEST-DB] Synced: ${syncResult.teachersCount} guru, ${syncResult.scheduleCount} slots.`);

        // 2. Set current week = 4 (only inside test.db!)
        await prisma.setting.upsert({
            where: { key: "current_week" },
            update: { value: "4" },
            create: { key: "current_week", value: "4" },
        });

        // 3. Seed sample piket for Monday (only inside test.db!)
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
        console.log(`[TEST-DB] Seeded test Piket Senin.`);

        // 4. Seed sample task (only inside test.db!)
        await TaskService.addTask("MP Data Analyst Jobsheet 5", new Date(2026, 9, 18), "Alden");
        console.log(`[TEST-DB] Seeded test Task.`);

        // 5. Seed sample notes (only inside test.db!)
        await prisma.note.deleteMany({});
        await prisma.note.createMany({
            data: [
                { text: "Hari senin membawa topi abu putih" },
                { text: "Hari rabu membawa baju olahraga" },
                { text: "Hari kamis kas kelas Rp. 1.000" },
            ],
        });
        console.log(`[TEST-DB] Seeded test Notes.\n`);

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
    } finally {
        await prisma.$disconnect();
        // Clean up temporary test database completely
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        console.log(`[TEST-DB] Cleaned up temporary test database. Real database remained untouched.`);
    }
}

testServices().catch(console.error);
