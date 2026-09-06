import type { TelegramMessageEntity } from "./client";

type CustomEmojiKey =
  | "brand"
  | "welcome"
  | "products"
  | "profile"
  | "keys"
  | "language"
  | "success";

type CustomEmojiMap = Partial<Record<CustomEmojiKey, string>>;

type RichText = {
  text: string;
  entities?: TelegramMessageEntity[];
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

export function withCustomEmoji(
  text: string,
  key: CustomEmojiKey,
  fallback = "✦",
): RichText {
  const customEmojiId = getCustomEmojiMap()[key];
  if (!customEmojiId) return { text };

  return {
    text: `${fallback} ${text}`,
    entities: [
      {
        type: "custom_emoji",
        offset: 0,
        length: fallback.length,
        custom_emoji_id: customEmojiId,
      },
    ],
  };
}