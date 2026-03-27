const { createClient } = require("redis");

let redisClient;

if (process.env.REDIS_URL) {
  // ✅ Production (Upstash / Cloud Redis)
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });
} else {
  // ✅ Local Development
  redisClient = createClient({
    socket: {
      host: "127.0.0.1",
      port: 6379,
    },
  });
}

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Redis connected");
  }
};

module.exports = { redisClient, connectRedis };