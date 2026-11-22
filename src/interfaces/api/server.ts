import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
import { apiRoutes } from "./routes.js";

export async function createServer() {
    const server = Fastify({
        logger: false,
    });

    await server.register(fastifyCors, {
        origin: true,
    });

    await server.register(apiRoutes);

    // Serve static files from web/dist if built
    const webDistPath = path.resolve(process.cwd(), "web", "dist");
    if (fs.existsSync(webDistPath)) {
        await server.register(fastifyStatic, {
            root: webDistPath,
            prefix: "/",
        });

        server.setNotFoundHandler((req, reply) => {
            if (req.url.startsWith("/api/")) {
                reply.status(404).send({ error: "API route not found" });
            } else {
                reply.sendFile("index.html");
            }
        });
    }

    return server;
}
