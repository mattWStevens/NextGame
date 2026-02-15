import Fastify from "fastify";
import { APP_NAME } from "@nextgame/shared";

const server = Fastify({ logger: true });

server.get("/api/health", async () => {
  return { status: "ok", app: APP_NAME };
});

const start = async () => {
  try {
    const port = Number(process.env.API_PORT) || 3001;
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 ${APP_NAME} API running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
