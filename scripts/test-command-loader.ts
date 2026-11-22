import { CommandRegistry } from "../src/interfaces/whatsapp/command-loader.js";

async function testLoader() {
    console.log("Testing Command Registry...");
    await CommandRegistry.loadCommands();
    const commands = CommandRegistry.getAllCommands();
    console.log(
        `Registered commands:`,
        commands.map((c) => `.${c.name} (${c.category})`)
    );

    const addCmd = CommandRegistry.getCommand("add");
    console.log("Check .add command:", addCmd ? "FOUND" : "MISSING");

    const menuAlias = CommandRegistry.getCommand("menu");
    console.log("Check alias .menu -> help:", menuAlias?.name === "help" ? "SUCCESS" : "FAILED");
}

testLoader().catch(console.error);
