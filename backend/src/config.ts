import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL || "postgres://pm_user:pm_secret_2024@localhost:5432/plugin_monitor",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "change_me_in_production",
    accessExpiresIn: "15m",
    refreshExpiresIn: "7d",
  },

  pluginSecret: process.env.PLUGIN_SECRET || "pm_shared_secret_change_in_production",

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },

  hazard: {
    registryUrl: "https://hazard.mf.gov.pl/api/Register",
    modificationDateUrl: "https://hazard.mf.gov.pl/api/Register/ModificationDate",
    pullIntervalMs: 2 * 60 * 60 * 1000, // 2 hours
  },
} as const;
