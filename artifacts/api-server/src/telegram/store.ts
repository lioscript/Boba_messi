import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  telegramKeys,
  telegramPurchases,
  telegramUsers,
  type TelegramKey,
  type TelegramPurchase,
  type TelegramUser,
} from "@workspace/db/schema";
import type { BotLanguage } from "./i18n";

export type InventoryGame = "oxide";
export type InventoryPlatform = "ios" | "android";
export type InventoryDuration = "1d" | "7d" | "30d";

export async function ensureTelegramUser(input: {
  telegramId: string;
  username?: string;
  firstName: string;
}): Promise<TelegramUser> {
  const existing = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, input.telegramId))
    .limit(1);

  if (existing[0]) {
    const updated = await db
      .update(telegramUsers)
      .set({
        username: input.username ?? null,
        firstName: input.firstName,
      })
      .where(eq(telegramUsers.telegramId, input.telegramId))
      .returning();
    return updated[0] ?? existing[0];
  }

  const created = await db
    .insert(telegramUsers)
    .values({
      telegramId: input.telegramId,
      username: input.username ?? null,
      firstName: input.firstName,
    })
    .returning();
  return created[0];
}

export async function setTelegramLanguage(
  telegramId: string,
  language: BotLanguage,
): Promise<TelegramUser> {
  const updated = await db
    .update(telegramUsers)
    .set({ language, languageSelected: true })
    .where(eq(telegramUsers.telegramId, telegramId))
    .returning();
  if (!updated[0]) {
    throw new Error(`Telegram user ${telegramId} was not found`);
  }
  return updated[0];
}

export async function getTelegramUser(
  telegramId: string,
): Promise<TelegramUser | undefined> {
  const result = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, telegramId))
    .limit(1);
  return result[0];
}

export async function getTelegramPurchases(
  telegramId: string,
): Promise<TelegramPurchase[]> {
  return db
    .select()
    .from(telegramPurchases)
    .where(eq(telegramPurchases.telegramId, telegramId))
    .orderBy(desc(telegramPurchases.purchasedAt));
}

export async function addTelegramPurchase(input: {
  telegramId: string;
  product: string;
  platform: string;
  plan: string;
  keyValue?: string;
}): Promise<TelegramPurchase> {
  const result = await db
    .insert(telegramPurchases)
    .values(input)
    .returning();
  const [{ purchasesCount }] = await db
    .select({ purchasesCount: count() })
    .from(telegramPurchases)
    .where(eq(telegramPurchases.telegramId, input.telegramId));
  await db
    .update(telegramUsers)
    .set({
      purchasesCount,
    })
    .where(eq(telegramUsers.telegramId, input.telegramId));
  return result[0];
}

export async function getTelegramUsers(): Promise<TelegramUser[]> {
  return db.select().from(telegramUsers).orderBy(asc(telegramUsers.id));
}

export async function addTelegramKey(input: {
  game: InventoryGame;
  platform: InventoryPlatform;
  duration: InventoryDuration;
  keyValue: string;
}): Promise<TelegramKey> {
  const result = await db
    .insert(telegramKeys)
    .values(input)
    .returning();
  return result[0];
}

export async function countTelegramKeys(input: {
  game: InventoryGame;
  platform: InventoryPlatform;
  duration?: InventoryDuration;
}): Promise<number> {
  const filters = [
    eq(telegramKeys.game, input.game),
    eq(telegramKeys.platform, input.platform),
  ];
  if (input.duration) {
    filters.push(eq(telegramKeys.duration, input.duration));
  }
  const result = await db
    .select({ count: count() })
    .from(telegramKeys)
    .where(and(...filters));
  return Number(result[0]?.count ?? 0);
}

export async function listTelegramKeys(input: {
  game: InventoryGame;
  platform: InventoryPlatform;
  duration: InventoryDuration;
}): Promise<TelegramKey[]> {
  return db
    .select()
    .from(telegramKeys)
    .where(
      and(
        eq(telegramKeys.game, input.game),
        eq(telegramKeys.platform, input.platform),
        eq(telegramKeys.duration, input.duration),
      ),
    )
    .orderBy(asc(telegramKeys.id));
}

export async function deleteTelegramKey(id: number): Promise<void> {
  await db.delete(telegramKeys).where(eq(telegramKeys.id, id));
}