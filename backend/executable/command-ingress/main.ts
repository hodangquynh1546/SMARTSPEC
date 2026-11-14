import logger from "../../lib/logger";
import "reflect-metadata";
import { config } from "dotenv";
import { initSocket } from "./socket";
import path from "path";
config({ path: path.join(process.cwd(), ".env") });
import { createHttpServer } from "./app";
import mongoose from "mongoose";
import env from "./utils/env";
import { connectRedis } from "../../lib/redis";

async function start() {
  await mongoose.connect(env.MONGO_URI);

  // ✅ Kết nối Redis
  let redisClient: ReturnType<typeof import('redis').createClient> | undefined = undefined;
  try {
    if (process.env.REDIS_URI) {
      redisClient = await connectRedis();
      logger.info('✅ Redis connected successfully');
      logger.info(`   Redis URI: ${process.env.REDIS_URI.replace(/:[^:@]+@/, ':****@')}`); // Ẩn password nếu có
    } else {
      logger.warn('⚠️ REDIS_URI not set in .env file');
      logger.warn('   Redis features (Presence Service, Stats Caching) will be disabled');
      logger.warn('   To enable Redis/Memurai, add to .env: REDIS_URI=redis://localhost:6380');
    }
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    logger.warn('⚠️ Continuing without Redis, some features will be disabled');
    logger.warn('   Make sure Redis/Memurai is running');
    logger.warn('   Set REDIS_URI in .env: REDIS_URI=redis://localhost:6380');
  }

  const server = createHttpServer(redisClient);

  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Server running on port http://localhost:${env.PORT}`);
  });

  process.on("SIGINT", async () => {
    if (redisClient) {
      await redisClient.quit();
    }
    // Avoid connection leak.
    mongoose.connection.close();
    process.exit(0);
  });
}

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});
