import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

type TelegramEnvelope<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: TelegramUser;
  text?: string;
  entities?: TelegramMessageEntity[];
  date: number;
};

export type TelegramMessageEntity = {
  type: string;
  offset: number;
  length: number;
  custom_emoji_id?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramUser;
  message?: TelegramMessage;
};

export type InlineButton = {
  text: string;
  callback_data: string;
};

export type InlineKeyboard = InlineButton[][];

export async function telegramRequest<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await connectors.proxy("telegram", `/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as TelegramEnvelope<T>;
  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(
      `Telegram ${method} failed (${payload.error_code ?? response.status}): ${payload.description ?? "Unknown error"}`,
    );
  }
  return payload.result;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  keyboard: InlineKeyboard,
  entities?: TelegramMessageEntity[],
): Promise<TelegramMessage> {
  return telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text,
    ...(entities?.length ? { entities } : {}),
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  keyboard: InlineKeyboard,
  entities?: TelegramMessageEntity[],
): Promise<TelegramMessage> {
  return telegramRequest<TelegramMessage>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...(entities?.length ? { entities } : {}),
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

export async function answerTelegramCallback(
  callbackQueryId: string,
): Promise<boolean> {
  return telegramRequest<boolean>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
  });
}