import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const telegramUsers = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name").notNull(),
  language: text("language").notNull().default("ru"),
  languageSelected: boolean("language_selected").notNull().default(false),
  registeredAt: timestamp("registered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  balanceRoubles: integer("balance_roubles").notNull().default(0),
  purchasesCount: integer("purchases_count").notNull().default(0),
});

export const telegramPurchases = pgTable("telegram_purchases", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  product: text("product").notNull(),
  platform: text("platform").notNull(),
  plan: text("plan").notNull(),
  keyValue: text("key_value"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const telegramKeys = pgTable("telegram_keys", {
  id: serial("id").primaryKey(),
  game: text("game").notNull(),
  platform: text("platform").notNull(),
  duration: text("duration").notNull(),
  keyValue: text("key_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type TelegramPurchase = typeof telegramPurchases.$inferSelect;
export type TelegramKey = typeof telegramKeys.$inferSelect;