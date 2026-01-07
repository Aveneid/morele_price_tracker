import { eq, and, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  products,
  Product,
  InsertProduct,
  priceHistory,
  PriceHistory,
  InsertPriceHistory,
  settings,
  Settings,
  InsertSettings,
  adminUsers,
  AdminUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ PRODUCT QUERIES ============

export async function createProduct(
  userId: number,
  data: Omit<InsertProduct, "userId">
): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .insert(products)
    .values({ ...data, userId })
    .$returningId();

  if (result.length === 0) return null;

  const productId = result[0].id;
  const created = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getUserProducts(userId: number): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(products).where(eq(products.userId, userId));
}

export async function getProductById(id: number): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateProduct(
  id: number,
  data: Partial<InsertProduct>
): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(products).set(data).where(eq(products.id, id));

  return getProductById(id);
}

export async function deleteProduct(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(products).where(eq(products.id, id));
  return true;
}

// ============ PRICE HISTORY QUERIES ============

export async function recordPrice(
  productId: number,
  price: number
): Promise<PriceHistory | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .insert(priceHistory)
    .values({ productId, price })
    .$returningId();

  if (result.length === 0) return null;

  const historyId = result[0].id;
  const created = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.id, historyId))
    .limit(1);

  return created.length > 0 ? created[0] : null;
}

export async function getProductPriceHistory(
  productId: number,
  limit: number = 100
): Promise<PriceHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(desc(priceHistory.recordedAt))
    .limit(limit);
}

export async function getProductPriceHistoryByDate(
  productId: number,
  daysBack: number = 30
): Promise<PriceHistory[]> {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return db
    .select()
    .from(priceHistory)
    .where(
      and(
        eq(priceHistory.productId, productId),
        gte(priceHistory.recordedAt, cutoffDate)
      )
    )
    .orderBy(desc(priceHistory.recordedAt));
}

// ============ SETTINGS QUERIES ============

export async function getOrCreateSettings(userId: number): Promise<Settings> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default settings
  const result = await db
    .insert(settings)
    .values({
      userId,
      trackingIntervalMinutes: 60,
      priceDropAlertThreshold: 10,
    })
    .$returningId();

  const settingsId = result[0].id;
  const created = await db
    .select()
    .from(settings)
    .where(eq(settings.id, settingsId))
    .limit(1);

  return created[0];
}

export async function updateSettings(
  userId: number,
  data: Partial<InsertSettings>
): Promise<Settings | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(settings).set(data).where(eq(settings.userId, userId));

  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getSettings(userId: number): Promise<Settings | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ PUBLIC PRODUCTS QUERIES ============

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(products).orderBy(desc(products.createdAt));
}

// ============ ADMIN QUERIES ============

export async function getAdminByUsername(
  username: string
): Promise<AdminUser | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
