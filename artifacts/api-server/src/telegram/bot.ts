import { logger } from "../lib/logger";
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendTelegramMessage,
  telegramRequest,
  type InlineKeyboard,
  type TelegramCallbackQuery,
  type TelegramMessage,
  type TelegramUpdate,
} from "./client";
import {
  composeRichText,
  getCustomEmojiId,
  withCustomEmoji,
  type CustomEmojiKey,
  type RichTextPart,
} from "./custom-emoji";
import { getCopy, isBotLanguage, type BotLanguage } from "./i18n";
import {
  ensureTelegramUser,
  getTelegramPurchases,
  getTelegramUser,
  setTelegramLanguage,
} from "./store";

const ACTION = {
  back: "back",
  language: "language",
  languageEnglish: "language:en",
  languageRussian: "language:ru",
  main: "main",
  myKeys: "keys",
  oxide: "product:oxide",
  platformAndroid: "platform:android",
  platformIos: "platform:ios",
  products: "products",
  profile: "profile",
  unavailable: "unavailable",
} as const;

let started = false;
let offset = 0;

function button(
  text: string,
  callbackData: string,
  emojiKey?: CustomEmojiKey,
) {
  const iconCustomEmojiId = emojiKey
    ? getCustomEmojiId(emojiKey)
    : undefined;
  return {
    text: emojiKey ? withoutMenuIcon(text) : text,
    callback_data: callbackData,
    ...(iconCustomEmojiId
      ? { icon_custom_emoji_id: iconCustomEmojiId }
      : {}),
  };
}

function copyButton(text: string, value: string) {
  return { text, copy_text: { text: value } };
}

function withoutMenuIcon(label: string): string {
  return label.replace(/^[^\p{L}\p{N}]*/u, "").trim();
}

function languageKeyboard(): InlineKeyboard {
  return [
    [
      button("🇷🇺 Русский", ACTION.languageRussian),
      button("🇬🇧 English", ACTION.languageEnglish),
    ],
  ];
}

function mainKeyboard(copy: ReturnType<typeof getCopy>): InlineKeyboard {
  return [
    [button(copy.products, ACTION.products, "products")],
    [
      button(copy.profile, ACTION.profile, "profile"),
      button(copy.myKeys, ACTION.myKeys, "keys"),
    ],
    [button(copy.reviews, ACTION.unavailable, "reviews")],
    [
      button(copy.referrals, ACTION.unavailable, "referrals"),
      button(copy.support, ACTION.unavailable, "support"),
    ],
    [button(copy.language, ACTION.language, "language")],
  ];
}

function productKeyboard(copy: ReturnType<typeof getCopy>): InlineKeyboard {
  return [
    [button(copy.oxiDe, ACTION.oxide, "oxide")],
    [button(copy.back, ACTION.main)],
  ];
}

function platformKeyboard(copy: ReturnType<typeof getCopy>): InlineKeyboard {
  return [
    [button(copy.ios, ACTION.platformIos, "platformIos")],
    [button(copy.androidSoon, ACTION.platformAndroid, "platformAndroid")],
    [button(copy.back, ACTION.products)],
  ];
}

function planKeyboard(copy: ReturnType<typeof getCopy>): InlineKeyboard {
  return [
    [
      button(
        `⚡ ${copy.planDetails} · 1 Day — ${copy.outOfStock}`,
        ACTION.unavailable,
        "choosePlan",
      ),
    ],
    [
      button(
        `♡ ${copy.planDetails} · 7 Days — ${copy.outOfStock}`,
        ACTION.unavailable,
        "choosePlan",
      ),
    ],
    [
      button(
        `☆ ${copy.planDetails} · 30 Days — ${copy.outOfStock}`,
        ACTION.unavailable,
        "choosePlan",
      ),
    ],
    [button(copy.back, ACTION.oxide)],
  ];
}

function profileKeyboard(copy: ReturnType<typeof getCopy>): InlineKeyboard {
  return [
    [button(copy.topUpBalance, ACTION.unavailable)],
    [button(copy.myKeys, ACTION.myKeys)],
    [button(copy.back, ACTION.main)],
  ];
}

function unavailableKeyboard(copy: ReturnType<typeof getCopy>): InlineKeyboard {
  return [[button(copy.back, ACTION.main)]];
}

function mainMessageParts(
  copy: ReturnType<typeof getCopy>,
  firstName: string,
): RichTextPart[] {
  return [
    { text: copy.welcome(firstName), emojiKey: "welcome" },
    { text: "\n\n" },
    { text: copy.activation, emojiKey: "activation" },
    { text: "\n" },
    { text: copy.vipAccess, emojiKey: "vip" },
    { text: "\n" },
    { text: copy.support247, emojiKey: "support247" },
    { text: "\n\n" },
    { text: copy.chooseSection, emojiKey: "chooseSection" },
  ];
}

function productMessageParts(
  copy: ReturnType<typeof getCopy>,
): RichTextPart[] {
  return [
    { text: copy.productHeading, emojiKey: "productHeading" },
    { text: `\n\n${copy.productDescription}` },
  ];
}

function platformMessageParts(
  copy: ReturnType<typeof getCopy>,
): RichTextPart[] {
  return [
    { text: copy.oxideTitle, emojiKey: "oxide" },
    { text: "\n\n" },
    { text: withoutMenuIcon(copy.ios), emojiKey: "platformIos" },
    { text: "\n" },
    { text: withoutMenuIcon(copy.androidSoon), emojiKey: "platformAndroid" },
    { text: `\n\n${copy.platformPrompt}` },
  ];
}

function planMessageParts(copy: ReturnType<typeof getCopy>): RichTextPart[] {
  return [
    { text: copy.planTitle, emojiKey: "oxide" },
    { text: "\n\n" },
    { text: copy.planPrompt, emojiKey: "choosePlan" },
    { text: `\n\n${copy.planFeatures}\n\n` },
    { text: copy.paymentPending, emojiKey: "payment" },
  ];
}

function languageFromUser(
  user: Awaited<ReturnType<typeof ensureTelegramUser>>,
): BotLanguage {
  return isBotLanguage(user.language) ? user.language : "ru";
}

async function sendRichMessage(
  chatId: number,
  text: string,
  keyboard: InlineKeyboard,
  emojiKey: Parameters<typeof withCustomEmoji>[1],
): Promise<void> {
  const richText = withCustomEmoji(text, emojiKey);
  await sendTelegramMessage(chatId, richText.text, keyboard, richText.entities);
}

async function editRichMessage(
  callback: TelegramCallbackQuery,
  text: string,
  keyboard: InlineKeyboard,
  emojiKey: Parameters<typeof withCustomEmoji>[1],
): Promise<void> {
  if (!callback.message) return;
  const richText = withCustomEmoji(text, emojiKey);
  await editTelegramMessage(
    callback.message.chat.id,
    callback.message.message_id,
    richText.text,
    keyboard,
    richText.entities,
  );
}

async function sendComposedMessage(
  chatId: number,
  parts: RichTextPart[],
  keyboard: InlineKeyboard,
): Promise<void> {
  const richText = composeRichText(parts);
  await sendTelegramMessage(chatId, richText.text, keyboard, richText.entities);
}

async function editComposedMessage(
  callback: TelegramCallbackQuery,
  parts: RichTextPart[],
  keyboard: InlineKeyboard,
): Promise<void> {
  if (!callback.message) return;
  const richText = composeRichText(parts);
  await editTelegramMessage(
    callback.message.chat.id,
    callback.message.message_id,
    richText.text,
    keyboard,
    richText.entities,
  );
}

async function sendStart(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) return;
  const telegramId = String(from.id);
  const existingUser = await getTelegramUser(telegramId);
  await ensureTelegramUser({
    telegramId,
    username: from.username,
    firstName: from.first_name,
  });

  if (existingUser?.languageSelected) {
    await renderMain(message.chat.id, from, languageFromUser(existingUser));
    return;
  }

  await sendComposedMessage(
    message.chat.id,
    [
      {
        text: "Добро пожаловать в AQREH SHOP!\n\nChoose your language / Выберите язык",
        emojiKey: "welcome",
      },
    ],
    languageKeyboard(),
  );
}

async function renderMain(
  chatId: number,
  from: TelegramCallbackQuery["from"],
  language: BotLanguage,
  callback?: TelegramCallbackQuery,
): Promise<void> {
  const user = await ensureTelegramUser({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });
  const copy = getCopy(language);
  if (callback) {
    await editComposedMessage(
      callback,
      mainMessageParts(copy, user.firstName),
      mainKeyboard(copy),
    );
  } else {
    await sendComposedMessage(
      chatId,
      mainMessageParts(copy, user.firstName),
      mainKeyboard(copy),
    );
  }
}

async function handleCallback(callback: TelegramCallbackQuery): Promise<void> {
  await answerTelegramCallback(callback.id);
  const message = callback.message;
  if (!message || !callback.data) return;

  const user = await ensureTelegramUser({
    telegramId: String(callback.from.id),
    username: callback.from.username,
    firstName: callback.from.first_name,
  });
  let language = languageFromUser(user);
  let copy = getCopy(language);

  switch (callback.data) {
    case ACTION.languageRussian:
    case ACTION.languageEnglish: {
      const nextLanguage: BotLanguage =
        callback.data === ACTION.languageEnglish ? "en" : "ru";
      const updated = await setTelegramLanguage(
        String(callback.from.id),
        nextLanguage,
      );
      language = isBotLanguage(updated.language) ? updated.language : nextLanguage;
      await renderMain(message.chat.id, callback.from, language, callback);
      return;
    }
    case ACTION.main:
      await renderMain(message.chat.id, callback.from, language, callback);
      return;
    case ACTION.products:
      await editComposedMessage(
        callback,
        productMessageParts(copy),
        productKeyboard(copy),
      );
      return;
    case ACTION.oxide:
      await editComposedMessage(
        callback,
        platformMessageParts(copy),
        platformKeyboard(copy),
      );
      return;
    case ACTION.platformIos:
      await editComposedMessage(
        callback,
        planMessageParts(copy),
        planKeyboard(copy),
      );
      return;
    case ACTION.platformAndroid:
    case ACTION.unavailable:
      await editRichMessage(
        callback,
        copy.unavailableSection,
        unavailableKeyboard(copy),
        "success",
      );
      return;
    case ACTION.profile:
      await editRichMessage(
        callback,
        copy.profileDetails({
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          language,
          registeredAt: user.registeredAt,
          purchasesCount: user.purchasesCount,
          balanceRoubles: user.balanceRoubles,
        }),
        profileKeyboard(copy),
        "profile",
      );
      return;
    case ACTION.myKeys: {
      const purchases = await getTelegramPurchases(String(callback.from.id));
      const history =
        purchases.length === 0
          ? copy.emptyKeys
          : purchases
              .map(
                (purchase) =>
                  `${purchase.product} · ${purchase.plan}\n${purchase.keyValue ?? "Ключ готується"}`,
              )
              .join("\n\n");
      await editRichMessage(
        callback,
        history,
        unavailableKeyboard(copy),
        "keys",
      );
      return;
    }
    case ACTION.language:
      await editRichMessage(
        callback,
        "Choose your language / Выберите язык",
        languageKeyboard(),
        "language",
      );
      return;
    case ACTION.back:
    default:
      await renderMain(message.chat.id, callback.from, language, callback);
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  const from = message.from;
  if (!text || !from) return;

  const customEmojiIds = (message.entities ?? [])
    .filter((entity) => entity.type === "custom_emoji")
    .map((entity) => entity.custom_emoji_id)
    .filter((customEmojiId): customEmojiId is string => Boolean(customEmojiId));
  if (customEmojiIds.length > 0) {
    const copyKeyboard: InlineKeyboard = customEmojiIds.map((customEmojiId, index) => [
      copyButton(`📋  Скопіювати ${index + 1}`, customEmojiId),
    ]);
    copyKeyboard.push([button("↩️  Назад", ACTION.main)]);
    await sendTelegramMessage(
      message.chat.id,
      `Custom Emoji ID:\n${customEmojiIds
        .map((customEmojiId, index) => `${index + 1}. ${customEmojiId}`)
        .join("\n")}\n\nНатисни кнопку під потрібним ID, щоб скопіювати його.`,
      copyKeyboard,
    );
    return;
  }

  if (text === "/start") {
    await sendStart(message);
    return;
  }

  const user = await ensureTelegramUser({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });
  await renderMain(message.chat.id, from, languageFromUser(user));
}

async function poll(): Promise<void> {
  try {
    const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
      timeout: 20,
      offset,
      allowed_updates: ["message", "callback_query"],
    });
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);
      if (update.callback_query) {
        await handleCallback(update.callback_query);
      } else if (update.message) {
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
    const bot = await telegramRequest<{
      id: number;
      username?: string;
      first_name: string;
    }>("getMe");
    logger.info(
      { username: bot.username, name: bot.first_name },
      "Telegram bot connected",
    );
    void poll();
  } catch (error) {
    started = false;
    logger.error({ err: error }, "Telegram bot failed to start");
  }
}