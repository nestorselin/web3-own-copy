import * as process from "process";

export const configFile = (): Record<string, unknown> => ({
  nodeEnv: process.env.NODE_ENV,
  serverPort: process.env.SERVER_PORT,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  authSecret: process.env.AUTH_SECRET,
  changeNowKey: process.env.CHANGE_NOW_KEY,
  rpcURL: process.env.RPC_URL,
  wsRpcURL: process.env.WS_RPC_URL,
  feeWallet: process.env.FEE_WALLET,

  dbConfigs: {
    type: "postgres",
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + "/**/*.entity{.ts,.js}"],
    synchronize: true,
    migrationsRun: true,
    logging: false,
    logger: "file",
    migrations: [__dirname + "/migrations/**/*{.ts,.js}"],
    autoLoadEntities: true,
    extra: {
      charset: "utf8mb4_unicode_ci",
    },
  },

  queueConfigs: {
    limiter: {
      max: 1,
      duration: 15000,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
      maxRetriesPerRequest: 1,
    },
    defaultJobOptions: {
      lifo: false,
      removeOnFail: true,
      removeOnComplete: true,
      attempts: 1,
    },
  },
});
