"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const prisma_1 = require("./lib/prisma");
const env_1 = require("./lib/env");
(0, env_1.validateRuntimeEnv)();
const port = Number(process.env.PORT) || 3000;
const server = app_1.default.listen(port, () => {
    console.log(`SMS workflow engine listening on port ${port}`);
});
let isShuttingDown = false;
async function shutdown(signal) {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down.`);
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        process.exit(0);
    });
    setTimeout(async () => {
        await prisma_1.prisma.$disconnect();
        process.exit(1);
    }, 10000).unref();
}
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
