import crypto from "crypto";
import mysql from "mysql2/promise";
import { ENV } from "./env";

/**
 * Idempotent database bootstrap, run once on server start.
 *
 * - creates the database itself if it does not exist (when the user is allowed to)
 * - creates every table that is missing (CREATE TABLE IF NOT EXISTS)
 * - adds columns that are missing from tables created by older versions
 * - widens legacy `int` price columns to `bigint`
 * - marks the drizzle migration history as applied on fresh databases, so a later
 *   `drizzle-kit migrate` does not try to recreate existing tables
 * - seeds the admin account (ADMIN_USERNAME / ADMIN_PASSWORD) and a default cleanup job
 *
 * The definitions below must stay in sync with drizzle/schema.ts.
 */

type TableDef = {
  name: string;
  /** [columnName, column DDL without the name] */
  columns: Array<[string, string]>;
  /** constraints / indexes used only when the table is created from scratch */
  constraints: string[];
};

const TS_NOW = "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP";
const TS_NOW_UPDATE = "timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
const TS_NULL = "timestamp NULL DEFAULT NULL";

// Order matters: referenced tables first.
const TABLES: TableDef[] = [
  {
    name: "users",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["openId", "varchar(64) NOT NULL"],
      ["name", "text"],
      ["email", "varchar(320)"],
      ["loginMethod", "varchar(64)"],
      ["role", "enum('user','admin') NOT NULL DEFAULT 'user'"],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
      ["lastSignedIn", TS_NOW],
    ],
    constraints: [
      "CONSTRAINT `users_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `users_openId_unique` UNIQUE (`openId`)",
    ],
  },
  {
    name: "products",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["name", "text NOT NULL"],
      ["url", "varchar(2048) NOT NULL"],
      ["productCode", "varchar(64)"],
      ["imageUrl", "text"],
      ["category", "varchar(255)"],
      ["currentPrice", "bigint"],
      ["previousPrice", "bigint"],
      ["priceChangePercent", "int NOT NULL DEFAULT 0"],
      ["checkIntervalMinutes", "int NOT NULL DEFAULT 60"],
      ["priceAlertThreshold", "int NOT NULL DEFAULT 10"],
      ["lastCheckedAt", TS_NULL],
      ["nextCheckTime", TS_NULL],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
    ],
    constraints: [
      "CONSTRAINT `products_id` PRIMARY KEY (`id`)",
      "INDEX `products_nextCheckTime_idx` (`nextCheckTime`)",
    ],
  },
  {
    name: "priceHistory",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["productId", "int NOT NULL"],
      ["price", "bigint NOT NULL"],
      ["recordedAt", TS_NOW],
    ],
    constraints: [
      "CONSTRAINT `priceHistory_id` PRIMARY KEY (`id`)",
      "INDEX `priceHistory_product_recorded_idx` (`productId`, `recordedAt`)",
      "CONSTRAINT `priceHistory_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    ],
  },
  {
    name: "settings",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["userId", "int"],
      ["trackingIntervalMinutes", "int NOT NULL DEFAULT 60"],
      ["priceDropAlertThreshold", "int NOT NULL DEFAULT 10"],
      ["userEmail", "varchar(320)"],
      ["emailNotificationsEnabled", "int NOT NULL DEFAULT 0"],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
    ],
    constraints: [
      "CONSTRAINT `settings_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `settings_userId_unique` UNIQUE (`userId`)",
      "CONSTRAINT `settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    ],
  },
  {
    name: "adminUsers",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["username", "varchar(255) NOT NULL"],
      ["passwordHash", "varchar(255) NOT NULL"],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
    ],
    constraints: [
      "CONSTRAINT `adminUsers_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `adminUsers_username_unique` UNIQUE (`username`)",
    ],
  },
  {
    name: "adminSessions",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["adminId", "int NOT NULL"],
      ["token", "varchar(255) NOT NULL"],
      ["expiresAt", "timestamp NOT NULL"],
      ["createdAt", TS_NOW],
    ],
    constraints: [
      "CONSTRAINT `adminSessions_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `adminSessions_token_unique` UNIQUE (`token`)",
      "CONSTRAINT `adminSessions_adminId_adminUsers_id_fk` FOREIGN KEY (`adminId`) REFERENCES `adminUsers` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    ],
  },
  {
    name: "jobs",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["name", "varchar(255) NOT NULL"],
      ["description", "text"],
      ["jobType", "enum('price_check','cleanup','report','custom') NOT NULL"],
      ["cronExpression", "varchar(255) NOT NULL"],
      ["isActive", "boolean NOT NULL DEFAULT true"],
      ["lastExecutedAt", TS_NULL],
      ["nextExecutionAt", TS_NULL],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
    ],
    constraints: ["CONSTRAINT `jobs_id` PRIMARY KEY (`id`)"],
  },
  {
    name: "jobExecutions",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["jobId", "int NOT NULL"],
      ["status", "enum('pending','running','success','failed') NOT NULL"],
      ["startedAt", TS_NULL],
      ["completedAt", TS_NULL],
      ["duration", "int"],
      ["result", "text"],
      ["logs", "text"],
      ["createdAt", TS_NOW],
    ],
    constraints: [
      "CONSTRAINT `jobExecutions_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `jobExecutions_jobId_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    ],
  },
  {
    name: "userPriceAlerts",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      ["userFingerprint", "varchar(255) NOT NULL"],
      ["productId", "int NOT NULL"],
      ["alertType", "enum('price','percent') NOT NULL DEFAULT 'percent'"],
      ["threshold", "bigint NOT NULL"],
      ["isActive", "boolean NOT NULL DEFAULT true"],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
    ],
    constraints: [
      "CONSTRAINT `userPriceAlerts_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `userPriceAlerts_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    ],
  },
  {
    name: "websiteTemplates",
    columns: [
      ["id", "int NOT NULL AUTO_INCREMENT"],
      // 768 chars * 4 bytes (utf8mb4) = 3072 bytes, the InnoDB limit for a unique index.
      // varchar(2048) UNIQUE fails on MySQL with "Specified key was too long".
      ["websiteUrl", "varchar(768) NOT NULL"],
      ["websiteName", "varchar(255) NOT NULL"],
      ["selectors", "text NOT NULL"],
      ["defaultCategory", "varchar(255)"],
      ["defaultImageUrl", "text"],
      ["isActive", "boolean NOT NULL DEFAULT true"],
      ["createdAt", TS_NOW],
      ["updatedAt", TS_NOW_UPDATE],
    ],
    constraints: [
      "CONSTRAINT `websiteTemplates_id` PRIMARY KEY (`id`)",
      "CONSTRAINT `websiteTemplates_websiteUrl_unique` UNIQUE (`websiteUrl`)",
    ],
  },
];

/** Timestamp (`when`) of the last entry in drizzle/meta/_journal.json. */
const LAST_DRIZZLE_MIGRATION_WHEN = 1776167293920;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function databaseNameFromUrl(url: string): string | null {
  try {
    const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
    return name || null;
  } catch {
    return null;
  }
}

async function connectWithRetry(url: string, attempts = 15): Promise<mysql.Connection> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await mysql.createConnection(url);
    } catch (error: any) {
      lastError = error;
      // Unknown database: retrying will not help, let the caller create it.
      if (error?.code === "ER_BAD_DB_ERROR") throw error;
      console.warn(
        `[DB Init] Database not reachable (attempt ${attempt}/${attempts}): ${error?.code || error?.message}`
      );
      await sleep(2000);
    }
  }
  throw lastError;
}

async function openConnection(url: string): Promise<mysql.Connection> {
  try {
    return await connectWithRetry(url);
  } catch (error: any) {
    if (error?.code !== "ER_BAD_DB_ERROR") throw error;

    const dbName = databaseNameFromUrl(url);
    if (!dbName) throw error;

    console.log(`[DB Init] Database \`${dbName}\` does not exist, creating it...`);
    const serverUrl = new URL(url);
    serverUrl.pathname = "/";
    const serverConn = await connectWithRetry(serverUrl.toString());
    try {
      await serverConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, "``")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await serverConn.end();
    }
    return connectWithRetry(url);
  }
}

async function getExistingColumns(
  conn: mysql.Connection,
  table: string
): Promise<Map<string, string> | null> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS type
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  if (rows.length === 0) return null;
  return new Map(rows.map(r => [String(r.name), String(r.type).toLowerCase()]));
}

async function ensureTable(conn: mysql.Connection, table: TableDef): Promise<string[]> {
  const changes: string[] = [];
  const existing = await getExistingColumns(conn, table.name);

  if (!existing) {
    const body = [
      ...table.columns.map(([col, ddl]) => `\`${col}\` ${ddl}`),
      ...table.constraints,
    ].join(",\n  ");
    await conn.query(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n  ${body}\n)`);
    changes.push(`created table ${table.name}`);
    return changes;
  }

  for (const [col, ddl] of table.columns) {
    const currentType = existing.get(col);
    if (!currentType) {
      await conn.query(`ALTER TABLE \`${table.name}\` ADD COLUMN \`${col}\` ${ddl}`);
      changes.push(`added ${table.name}.${col}`);
    } else if (ddl.startsWith("bigint") && currentType !== "bigint") {
      // Prices were stored as INT in early versions (overflows above ~21M PLN in cents).
      await conn.query(`ALTER TABLE \`${table.name}\` MODIFY COLUMN \`${col}\` ${ddl}`);
      changes.push(`widened ${table.name}.${col} to bigint`);
    }
  }
  return changes;
}

/**
 * Mark the drizzle migrations as applied when the schema was created here, so that
 * running `drizzle-kit migrate` / `pnpm db:push` later does not fail on existing tables.
 */
async function baselineDrizzleMigrations(conn: mysql.Connection) {
  await conn.query(
    "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)"
  );
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT MAX(created_at) AS last FROM `__drizzle_migrations`"
  );
  const last = Number(rows[0]?.last ?? 0);
  if (last < LAST_DRIZZLE_MIGRATION_WHEN) {
    await conn.query("INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)", [
      "baseline-created-by-schemaInit",
      LAST_DRIZZLE_MIGRATION_WHEN,
    ]);
  }
}

async function seedAdminUser(conn: mysql.Connection) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) AS cnt FROM `adminUsers`"
  );
  if (Number(rows[0]?.cnt ?? 0) > 0) return;

  const username = ENV.adminUsername;
  const passwordHash = crypto.createHash("sha1").update(ENV.adminPassword).digest("hex");
  await conn.query("INSERT INTO `adminUsers` (username, passwordHash) VALUES (?, ?)", [
    username,
    passwordHash,
  ]);
  console.log(`[DB Init] Created admin user "${username}" (from ADMIN_USERNAME / ADMIN_PASSWORD)`);
}

async function seedDefaultJobs(conn: mysql.Connection) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM `jobs`");
  if (Number(rows[0]?.cnt ?? 0) > 0) return;

  await conn.query(
    "INSERT INTO `jobs` (name, description, jobType, cronExpression, isActive) VALUES (?, ?, ?, ?, ?)",
    [
      "Nightly cleanup",
      "Removes expired admin sessions and job execution logs older than 30 days",
      "cleanup",
      "0 3 * * *",
      true,
    ]
  );
  console.log("[DB Init] Created default cleanup job");
}

export async function initializeDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set - cannot initialize the database");
  }

  console.log("[DB Init] Checking database schema...");
  const conn = await openConnection(url);
  try {
    const [before] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'"
    );
    const freshDatabase = Number(before[0]?.cnt ?? 0) === 0;

    const changes: string[] = [];
    for (const table of TABLES) {
      changes.push(...(await ensureTable(conn, table)));
    }

    if (freshDatabase) {
      await baselineDrizzleMigrations(conn);
    }

    await seedAdminUser(conn);
    await seedDefaultJobs(conn);

    if (changes.length > 0) {
      console.log(`[DB Init] Schema updated: ${changes.join(", ")}`);
    } else {
      console.log("[DB Init] Schema is up to date");
    }
  } finally {
    await conn.end();
  }
}
