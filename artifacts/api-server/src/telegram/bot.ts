import { logger } from "../lib/logger";
import {
  sendTelegramMessage,
  telegramRequest,
  type TelegramMessage,
  type TelegramUpdate,
} from "./client";
import { getCopy, isBotLanguage, type BotLanguage } from "./i18n";
import {
  ensureTelegramUser,
  getTelegramPurchases,
  setTelegramLanguage,
} from "./store";

const MAIN_MENU_COMMAND = "main-menu";
let started = false;
let offset = 0;

function languageKeyboard(): string[][] {
  return [["🇷🇺 Русский", "🇬🇧 English"]];
}

function mainKeyboard(copy: ReturnType<typeof getCopy>): string[][] {
  return [
    [copy.products],
    [copy.profile, copy.myKeys],
    [copy.reviews],
    [copy.referrals, copy.support],
    [copy.language],
  ];
}

function productKeyboard(copy: ReturnType<typeof getCopy>): string[][] {
  return [[copy.oxiDe], [copy.back]];
}

function platformKeyboard(copy: ReturnType<typeof getCopy>): string[][] {
  return [[copy.ios], [copy.androidSoon], [copy.back]];
}

function planKeyboard(copy: ReturnType<typeof getCopy>): string[][] {
  return [
    [`⚡ ${copy.planDetails} · 1 Day — ${copy.outOfStock}`],
    [`♡ ${copy.planDetails} · 7 Days — ${copy.outOfStock}`],
    [`☆ ${copy.planDetails} · 30 Days — ${copy.outOfStock}`],
    [copy.back],
  ];
}

function languageFromUser(user: Awaited<ReturnType<typeof ensureTelegramUser>>): BotLanguage {
  return isBotLanguage(user.language) ? user.language : "ru";
}

async function sendStart(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) return;
  await ensureTelegramUser({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });
  await sendTelegramMessage(
    message.chat.id,
    "🌿 Добро пожаловать в OXIDE STORE!\n\nChoose your language / Выберите язык",
    languageKeyboard(),
  );
}

async function sendMainMenu(
  message: TelegramMessage,
  language: BotLanguage,
): Promise<void> {
  const from = message.from;
  if (!from) return;
  const user = await ensureTelegramUser({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });
  const copy = getCopy(language);
  await sendTelegramMessage(
    message.chat.id,
    `${copy.welcome(user.firstName)}\n\n${copy.welcomeDetails}\n\n${copy.chooseSection}`,
    mainKeyboard(copy),
  );
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  const from = message.from;
  if (!text || !from) return;

  const user = await ensureTelegramUser({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });
  const language = languageFromUser(user);
  const copy = getCopy(language);

  if (text === "/start" || text === "/menu" || text === MAIN_MENU_COMMAND) {
    if (text === "/start") {
      await sendStart(message);
      return;
    }
    await sendMainMenu(message, language);
    return;
  }

  if (text === "🇷🇺 Русский" || text === "🇬🇧 English") {
    const nextLanguage: BotLanguage = text.includes("English") ? "en" : "ru";
    const updated = await setTelegramLanguage(String(from.id), nextLanguage);
    await sendMainMenu(message, isBotLanguage(updated.language) ? updated.language : nextLanguage);
    return;
  }

  if (text === copy.products || text === "💎  Продукты" || text === "💎  Products") {
    await sendTelegramMessage(message.chat.id, copy.chooseProduct, productKeyboard(copy));
    return;
  }

  if (text === copy.oxiDe || text === "💎  OXIDE") {
    await sendTelegramMessage(message.chat.id, copy.choosePlatform, platformKeyboard(copy));
    return;
  }

  if (text === copy.ios || text === "🔒  iOS") {
    await sendTelegramMessage(message.chat.id, copy.choosePlan, planKeyboard(copy));
    return;
  }

  if (text.includes("1 Day") || text.includes("7 Days") || text.includes("30 Days")) {
    await sendTelegramMessage(message.chat.id, copy.unavailable, planKeyboard(copy));
    return;
  }

  if (text === copy.androidSoon || text.includes("Android")) {
    await sendTelegramMessage(message.chat.id, copy.unavailable, platformKeyboard(copy));
    return;
  }

  if (text === copy.profile || text === "👤  Профиль" || text === "👤  Profile") {
    const profile = await ensureTelegramUser({
      telegramId: String(from.id),
      username: from.username,
      firstName: from.first_name,
    });
    await sendTelegramMessage(
      message.chat.id,
      copy.profileDetails({
        telegramId: profile.telegramId,
        firstName: profile.firstName,
        username: profile.username,
        language,
        registeredAt: profile.registeredAt,
        purchasesCount: profile.purchasesCount,
        balanceRoubles: profile.balanceRoubles,
      }),
      [[copy.topUpBalance], [copy.myKeys], [copy.back]],
    );
    return;
  }

  if (text === copy.myKeys || text === "🔐  Мої ключі" || text === "🔐  My keys") {
    const purchases = await getTelegramPurchases(String(from.id));
    await sendTelegramMessage(
      message.chat.id,
      purchases.length === 0
        ? copy.emptyKeys
        : purchases.map((purchase) => `${purchase.product} · ${purchase.plan}\n${purchase.keyValue ?? "Ключ готується"}`).join("\n\n"),
      [[copy.back]],
    );
    return;
  }

  if (
    text === copy.topUpBalance ||
    text === "💳  Пополнить баланс" ||
    text === "💳  Top up balance"
  ) {
    await sendTelegramMessage(message.chat.id, copy.unavailableSection, [[copy.back]]);
    return;
  }

  if (
    text === copy.reviews ||
    text === copy.referrals ||
    text === copy.support ||
    text === "⭐  Отзывы" ||
    text === "💎  Рефералы" ||
    text === "☎️  Поддержка" ||
    text === "⭐  Reviews" ||
    text === "💎  Referrals" ||
    text === "☎️  Support"
  ) {
    await sendTelegramMessage(message.chat.id, copy.unavailableSection, [[copy.back]]);
    return;
  }

  if (text === copy.language) {
    await sendTelegramMessage(
      message.chat.id,
      "Choose your language / Выберите язык",
      languageKeyboard(),
    );
    return;
  }

  if (text === copy.back || text === "↩️  Назад" || text === "↩️  Back") {
    await sendMainMenu(message, language);
    return;
  }

  await sendTelegramMessage(message.chat.id, copy.chooseSection, mainKeyboard(copy));
}

async function poll(): Promise<void> {
  try {
    const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
      timeout: 20,
      offset,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);
      if (update.message) {
        await handleMessage(update.message);
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Telegram polling error");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  if (started) {
    setImmediate(() => void poll());
  }
}

export async function startTelegramBot(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await telegramRequest("deleteWebhook", { drop_pending_updates: false });
    const bot = await telegramRequest<{ id: number; username?: string; first_name: string }>("getMe");
    logger.info({ username: bot.username, name: bot.first_name }, "Telegram bot connected");
    void poll();
  } catch (error) {
    started = false;
    logger.error({ err: error }, "Telegram bot failed to start");
  }
}