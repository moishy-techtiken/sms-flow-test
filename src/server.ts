import "dotenv/config";
import app from "./app";
import { prisma } from "./lib/prisma";
import { validateRuntimeEnv } from "./lib/env";

validateRuntimeEnv();
const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`SMS workflow engine listening on port ${port}`);
});

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(async () => {
    await prisma.$disconnect();
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
