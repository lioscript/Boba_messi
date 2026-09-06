import type { TelegramMessageEntity } from "./client";

type CustomEmojiKey =
  | "brand"
  | "welcome"
  | "activation"
  | "vip"
  | "support247"
  | "chooseSection"
  | "products"
  | "profile"
  | "keys"
  | "reviews"
  | "referrals"
  | "support"
  | "language"
  | "productHeading"
  | "oxide"
  | "platformIos"
  | "platformAndroid"
  | "choosePlan"
  | "payment"
  | "success";

type CustomEmojiMap = Partial<Record<CustomEmojiKey, string>>;

type RichText = {
  text: string;
  entities?: TelegramMessageEntity[];
};

export type RichTextPart = {
  text: string;
  emojiKey?: CustomEmojiKey;
};

const fallbackByKey: Record<CustomEmojiKey, string> = {
  brand: "🌿",
  welcome: "🌿",
  activation: "✅",
  vip: "🔒",
  support247: "⚡",
  chooseSection: "👇",
  products: "💎",
  profile: "👤",
  keys: "🔐",
  reviews: "⭐",
  referrals: "💎",
  support: "📞",
  language: "🌙",
  productHeading: "💎",
  oxide: "💎",
  platformIos: "🔒",
  platformAndroid: "🤖",
  choosePlan: "⚡",
  payment: "💳",
  success: "✅",
};

function getCustomEmojiMap(): CustomEmojiMap {
  const raw = process.env["TELEGRAM_CUSTOM_EMOJI_IDS"];
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as CustomEmojiMap;
  } catch {
    return {};
  }
}

export function composeRichText(parts: RichTextPart[]): RichText {
  const customEmojiMap = getCustomEmojiMap();
  let text = "";
  const entities: TelegramMessageEntity[] = [];

  for (const part of parts) {
    const customEmojiId = part.emojiKey
      ? customEmojiMap[part.emojiKey]
      : undefined;

    if (customEmojiId) {
      const fallback = fallbackByKey[part.emojiKey!];
      entities.push({
        type: "custom_emoji",
        offset: text.length,
        length: fallback.length,
        custom_emoji_id: customEmojiId,
      });
      text += `${fallback} `;
    }

    text += part.text;
  }

  return {
    text,
    ...(entities.length ? { entities } : {}),
  };
}

export function withCustomEmoji(
  text: string,
  key: CustomEmojiKey,
): RichText {
  return composeRichText([{ text, emojiKey: key }]);
}