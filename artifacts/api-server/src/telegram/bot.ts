import { logger } from "../lib/logger";
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendTelegramMessage,
  sendTelegramPhoto,
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
import { getAdminCopy, type AdminCopy } from "./admin-i18n";
import { getCopy, isBotLanguage, type BotLanguage } from "./i18n";
import {
  addTelegramKey,
  countTelegramKeys,
  deleteTelegramKey,
  ensureTelegramUser,
  getTelegramUsers,
  getTelegramPurchases,
  getTelegramUser,
  listTelegramKeys,
  setTelegramLanguage,
  type InventoryDuration,
  type InventoryGame,
  type InventoryPlatform,
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

const ADMIN_IDS = new Set(["5929338019", "5146686972"]);

const ADMIN_ACTION = {
  menu: "admin:menu",
  add: "admin:add",
  addGame: "admin:add:game:oxide",
  addPlatformPrefix: "admin:add:platform:",
  addDurationPrefix: "admin:add:duration:",
  view: "admin:view",
  viewGame: "admin:view:game:oxide",
  viewPlatformPrefix: "admin:view:platform:",
  viewDurationPrefix: "admin:view:duration:",
  deletePrefix: "admin:delete:",
  broadcast: "admin:broadcast",
  back: "admin:back",
} as const;

type AdminState =
  | {
      kind: "add-key";
      game: InventoryGame;
      platform: InventoryPlatform;
      duration: InventoryDuration;
    }
  | {
      kind: "view-keys";
      game: InventoryGame;
      platform: InventoryPlatform;
      duration: InventoryDuration;
    }
  | { kind: "broadcast-text" }
  | { kind: "broadcast-photo"; text: string };

const adminStates = new Map<string, AdminState>();

const PLAN_OPTIONS: Array<{
  duration: InventoryDuration;
  price: string;
}> = [
  { duration: "1d", price: "4$" },
  { duration: "7d", price: "10$" },
  { duration: "30d", price: "20$" },
];

const PLAN_LABELS: Record<
  BotLanguage,
  Record<InventoryDuration, string>
> = {
  ru: {
    "1d": "1 день",
    "7d": "7 дней",
    "30d": "30 дней",
  },
  en: {
    "1d": "1 Day",
    "7d": "7 Days",
    "30d": "30 Days",
  },
};

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

function linkButton(
  text: string,
  url: string,
  emojiKey?: CustomEmojiKey,
) {
  const iconCustomEmojiId = emojiKey
    ? getCustomEmojiId(emojiKey)
    : undefined;
  return {
    text: emojiKey ? withoutMenuIcon(text) : text,
    url,
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
    [
      linkButton(
        copy.reviews,
        "https://t.me/AQREH_COMMUNITY",
        "reviews",
      ),
    ],
    [
      button(copy.referrals, ACTION.unavailable, "referrals"),
      linkButton(copy.support, "https://t.me/SKh_an", "support"),
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

async function planKeyboard(
  copy: ReturnType<typeof getCopy>,
  language: BotLanguage,
  platform: InventoryPlatform,
): Promise<InlineKeyboard> {
  const planButtons = await Promise.all(
    PLAN_OPTIONS.map(async ({ duration, price }) => {
      const count = await countTelegramKeys({
        game: "oxide",
        platform,
        duration,
      });
      const availability =
        count > 0 ? copy.inStock(count) : copy.outOfStock;
      const callbackData =
        count > 0
          ? `plan:${platform}:${duration}`
          : ACTION.unavailable;
      const planTitle = `${copy.oxideTitle} ${
        platform === "ios" ? "iOS" : "Android"
      }`;
      return [
        button(
          `${PLAN_LABELS[language][duration]} · ${planTitle} · ${price} · ${availability}`,
          callbackData,
          "choosePlan",
        ),
      ];
    }),
  );

  return [...planButtons, [button(copy.back, ACTION.oxide)]];
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

function isAdminTelegramId(telegramId: string | number): boolean {
  return ADMIN_IDS.has(String(telegramId));
}

function adminMenuKeyboard(copy: AdminCopy): InlineKeyboard {
  return [
    [button(copy.addKey, ADMIN_ACTION.add)],
    [button(copy.viewKeys, ADMIN_ACTION.view)],
    [button(copy.broadcast, ADMIN_ACTION.broadcast)],
  ];
}

function adminGameKeyboard(
  copy: AdminCopy,
  actionPrefix: string,
): InlineKeyboard {
  return [
    [button(`🎮 ${copy.oxide}`, `${actionPrefix}oxide`)],
    [button(copy.back, ADMIN_ACTION.menu)],
  ];
}

function adminPlatformKeyboard(
  copy: AdminCopy,
  actionPrefix: string,
): InlineKeyboard {
  return [
    [button(`📱 ${copy.ios}`, `${actionPrefix}ios`)],
    [button(`📱 ${copy.android}`, `${actionPrefix}android`)],
    [button(copy.back, ADMIN_ACTION.menu)],
  ];
}

function adminDurationKeyboard(
  copy: AdminCopy,
  actionPrefix: string,
): InlineKeyboard {
  return [
    [button(`⏱ ${copy.oneDay}`, `${actionPrefix}1d`)],
    [button(`⏱ ${copy.week}`, `${actionPrefix}7d`)],
    [button(`⏱ ${copy.month}`, `${actionPrefix}30d`)],
    [button(copy.back, ADMIN_ACTION.menu)],
  ];
}

function adminKeyListKeyboard(
  copy: AdminCopy,
  keys: Awaited<ReturnType<typeof listTelegramKeys>>,
): InlineKeyboard {
  return [
    ...keys.map((key) => [
      button(
        `🗑 ${key.keyValue.slice(0, 34)}`,
        `${ADMIN_ACTION.deletePrefix}${key.id}`,
      ),
    ]),
    [button(copy.back, ADMIN_ACTION.view)],
  ];
}

async function showAdminScreen(
  chatId: number,
  language: BotLanguage,
  text: string,
  keyboard: InlineKeyboard,
  callback?: TelegramCallbackQuery,
): Promise<void> {
  if (callback?.message) {
    await editTelegramMessage(
      callback.message.chat.id,
      callback.message.message_id,
      text,
      keyboard,
    );
    return;
  }
  await sendTelegramMessage(chatId, text, keyboard);
}

async function renderAdminKeyList(
  callback: TelegramCallbackQuery,
  language: BotLanguage,
): Promise<void> {
  const state = adminStates.get(String(callback.from.id));
  if (!state || state.kind !== "view-keys") {
    await showAdminScreen(
      callback.message?.chat.id ?? callback.from.id,
      language,
      getAdminCopy(language).title,
      adminMenuKeyboard(getAdminCopy(language)),
      callback,
    );
    return;
  }

  const copy = getAdminCopy(language);
  const keys = await listTelegramKeys(state);
  const text = keys.length
    ? `${copy.keyList(keys.length)}\n\n${keys
        .map((key, index) => `${index + 1}. ${key.keyValue}`)
        .join("\n")}`
    : copy.noKeys;
  await showAdminScreen(
    callback.message?.chat.id ?? callback.from.id,
    language,
    text,
    adminKeyListKeyboard(copy, keys),
    callback,
  );
}

async function broadcastToUsers(
  text: string,
  photoFileId?: string,
): Promise<{ sent: number; failed: number }> {
  const users = await getTelegramUsers();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const chatId = Number(user.telegramId);
    if (!Number.isSafeInteger(chatId)) {
      failed += 1;
      continue;
    }

    try {
      if (photoFileId) {
        if (text.length <= 1024) {
          await sendTelegramPhoto(chatId, photoFileId, text);
        } else {
          await sendTelegramPhoto(chatId, photoFileId);
          await sendTelegramMessage(chatId, text, []);
        }
      } else {
        await sendTelegramMessage(chatId, text, []);
      }
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.warn({ err: error, telegramId: user.telegramId }, "Telegram broadcast delivery failed");
    }
  }

  return { sent, failed };
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

function planMessageParts(
  copy: ReturnType<typeof getCopy>,
  platform: InventoryPlatform,
): RichTextPart[] {
  return [
    {
      text: `${copy.oxideTitle} ${platform === "ios" ? "iOS" : "Android"}`,
      emojiKey: "oxide",
    },
    { text: "\n\n" },
    { text: copy.planPrompt, emojiKey: "choosePlan" },
    { text: `\n\n${copy.planFeatures}\n\n` },
    { text: copy.paymentPending, emojiKey: "payment" },
  ];
}

function isInventoryPlatform(value: string): value is InventoryPlatform {
  return value === "ios" || value === "android";
}

function isInventoryDuration(value: string): value is InventoryDuration {
  return value === "1d" || value === "7d" || value === "30d";
}

async function handleAdminCallback(
  callback: TelegramCallbackQuery,
  language: BotLanguage,
): Promise<void> {
  const data = callback.data ?? "";
  const copy = getAdminCopy(language);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const adminId = String(callback.from.id);

  if (data === ADMIN_ACTION.menu || data === ADMIN_ACTION.back) {
    adminStates.delete(adminId);
    await showAdminScreen(
      chatId,
      language,
      copy.title,
      adminMenuKeyboard(copy),
      callback,
    );
    return;
  }

  if (data === ADMIN_ACTION.add) {
    await showAdminScreen(
      chatId,
      language,
      copy.chooseGame,
      adminGameKeyboard(copy, "admin:add:game:"),
      callback,
    );
    return;
  }

  if (data === ADMIN_ACTION.addGame) {
    await showAdminScreen(
      chatId,
      language,
      copy.choosePlatform,
      adminPlatformKeyboard(copy, ADMIN_ACTION.addPlatformPrefix),
      callback,
    );
    return;
  }

  if (data.startsWith(ADMIN_ACTION.addPlatformPrefix)) {
    const platform = data.slice(ADMIN_ACTION.addPlatformPrefix.length);
    if (!isInventoryPlatform(platform)) return;
    await showAdminScreen(
      chatId,
      language,
      copy.chooseDuration,
      adminDurationKeyboard(
        copy,
        `${ADMIN_ACTION.addDurationPrefix}${platform}:`,
      ),
      callback,
    );
    return;
  }

  if (data.startsWith(ADMIN_ACTION.addDurationPrefix)) {
    const [platform, duration] = data
      .slice(ADMIN_ACTION.addDurationPrefix.length)
      .split(":");
    if (!isInventoryPlatform(platform) || !isInventoryDuration(duration)) {
      return;
    }
    adminStates.set(adminId, {
      kind: "add-key",
      game: "oxide",
      platform,
      duration,
    });
    await showAdminScreen(
      chatId,
      language,
      copy.enterKey,
      [[button(copy.back, ADMIN_ACTION.menu)]],
      callback,
    );
    return;
  }

  if (data === ADMIN_ACTION.view) {
    await showAdminScreen(
      chatId,
      language,
      copy.chooseGame,
      adminGameKeyboard(copy, "admin:view:game:"),
      callback,
    );
    return;
  }

  if (data === ADMIN_ACTION.viewGame) {
    await showAdminScreen(
      chatId,
      language,
      copy.choosePlatform,
      adminPlatformKeyboard(copy, ADMIN_ACTION.viewPlatformPrefix),
      callback,
    );
    return;
  }

  if (data.startsWith(ADMIN_ACTION.viewPlatformPrefix)) {
    const platform = data.slice(ADMIN_ACTION.viewPlatformPrefix.length);
    if (!isInventoryPlatform(platform)) return;
    await showAdminScreen(
      chatId,
      language,
      copy.chooseDuration,
      adminDurationKeyboard(
        copy,
        `${ADMIN_ACTION.viewDurationPrefix}${platform}:`,
      ),
      callback,
    );
    return;
  }

  if (data.startsWith(ADMIN_ACTION.viewDurationPrefix)) {
    const [platform, duration] = data
      .slice(ADMIN_ACTION.viewDurationPrefix.length)
      .split(":");
    if (!isInventoryPlatform(platform) || !isInventoryDuration(duration)) {
      return;
    }
    adminStates.set(adminId, {
      kind: "view-keys",
      game: "oxide",
      platform,
      duration,
    });
    await renderAdminKeyList(callback, language);
    return;
  }

  if (data.startsWith(ADMIN_ACTION.deletePrefix)) {
    const id = Number(data.slice(ADMIN_ACTION.deletePrefix.length));
    if (!Number.isSafeInteger(id)) return;
    const state = adminStates.get(adminId);
    if (!state || state.kind !== "view-keys") return;
    await deleteTelegramKey(id);
    await renderAdminKeyList(callback, language);
    return;
  }

  if (data === ADMIN_ACTION.broadcast) {
    adminStates.set(adminId, { kind: "broadcast-text" });
    await showAdminScreen(
      chatId,
      language,
      copy.broadcastText,
      [[button(copy.back, ADMIN_ACTION.menu)]],
      callback,
    );
  }
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

  if (callback.data.startsWith("admin:")) {
    if (isAdminTelegramId(callback.from.id)) {
      await handleAdminCallback(callback, language);
    }
    return;
  }

  if (callback.data.startsWith("plan:")) {
    await editRichMessage(
      callback,
      copy.paymentPending,
      unavailableKeyboard(copy),
      "payment",
    );
    return;
  }

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
    case ACTION.platformAndroid: {
      const platform: InventoryPlatform =
        callback.data === ACTION.platformAndroid ? "android" : "ios";
      await editComposedMessage(
        callback,
        planMessageParts(copy, platform),
        await planKeyboard(copy, language, platform),
      );
      return;
    }
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

async function handleAdminMessage(message: TelegramMessage): Promise<boolean> {
  const from = message.from;
  if (!from || !isAdminTelegramId(from.id)) return false;

  const adminId = String(from.id);
  const state = adminStates.get(adminId);
  if (!state) return false;

  const user = await ensureTelegramUser({
    telegramId: adminId,
    username: from.username,
    firstName: from.first_name,
  });
  const language = languageFromUser(user);
  const copy = getAdminCopy(language);
  const text = message.text?.trim();
  const photo = message.photo?.at(-1);

  if (text === "/cancel") {
    adminStates.delete(adminId);
    await sendTelegramMessage(
      message.chat.id,
      copy.cancelled,
      adminMenuKeyboard(copy),
    );
    return true;
  }

  if (state.kind === "add-key") {
    if (!text) {
      await sendTelegramMessage(message.chat.id, copy.enterKey, [
        [button(copy.back, ADMIN_ACTION.menu)],
      ]);
      return true;
    }
    const key = await addTelegramKey({
      ...state,
      keyValue: text,
    });
    const count = await countTelegramKeys({
      game: state.game,
      platform: state.platform,
      duration: state.duration,
    });
    adminStates.delete(adminId);
    await sendTelegramMessage(
      message.chat.id,
      `${copy.keyAdded(count)}\n\n${key.keyValue}`,
      adminMenuKeyboard(copy),
    );
    return true;
  }

  if (state.kind === "broadcast-text") {
    if (!text) {
      await sendTelegramMessage(message.chat.id, copy.broadcastText, [
        [button(copy.back, ADMIN_ACTION.menu)],
      ]);
      return true;
    }
    adminStates.set(adminId, { kind: "broadcast-photo", text });
    await sendTelegramMessage(message.chat.id, copy.broadcastPhoto, [
      [button(copy.back, ADMIN_ACTION.menu)],
    ]);
    return true;
  }

  if (state.kind === "broadcast-photo") {
    if (text === "/skip") {
      adminStates.delete(adminId);
      const result = await broadcastToUsers(state.text);
      await sendTelegramMessage(
        message.chat.id,
        `${copy.broadcastSkipped}\n\n${copy.broadcastDone(
          result.sent,
          result.failed,
        )}`,
        adminMenuKeyboard(copy),
      );
      return true;
    }

    if (!photo) {
      await sendTelegramMessage(message.chat.id, copy.broadcastPhoto, [
        [button(copy.back, ADMIN_ACTION.menu)],
      ]);
      return true;
    }

    adminStates.delete(adminId);
    const result = await broadcastToUsers(state.text, photo.file_id);
    await sendTelegramMessage(
      message.chat.id,
      copy.broadcastDone(result.sent, result.failed),
      adminMenuKeyboard(copy),
    );
    return true;
  }

  return true;
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) return;
  const text = message.text?.trim();

  if (text === "/adm") {
    if (!isAdminTelegramId(from.id)) return;
    const user = await ensureTelegramUser({
      telegramId: String(from.id),
      username: from.username,
      firstName: from.first_name,
    });
    adminStates.delete(String(from.id));
    const language = languageFromUser(user);
    await sendTelegramMessage(
      message.chat.id,
      getAdminCopy(language).title,
      adminMenuKeyboard(getAdminCopy(language)),
    );
    return;
  }

  if (text === "/start") {
    await sendStart(message);
    return;
  }

  if (await handleAdminMessage(message)) return;
  if (!text) return;

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