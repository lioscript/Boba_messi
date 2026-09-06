import { count, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  telegramPurchases,
  telegramUsers,
  type TelegramPurchase,
  type TelegramUser,
} from "@workspace/db/schema";
import type { BotLanguage } from "./i18n";

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
    .set({ language })
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