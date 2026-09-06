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
  date: number;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

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
  keyboard: string[][],
): Promise<TelegramMessage> {
  return telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      keyboard: keyboard.map((row) =>
        row.map((button) => ({ text: button })),
      ),
      resize_keyboard: true,
      is_persistent: true,
    },
  });
}