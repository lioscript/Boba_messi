import type { BotLanguage } from "./i18n";

export type AdminCopy = {
  title: string;
  addKey: string;
  viewKeys: string;
  broadcast: string;
  chooseGame: string;
  choosePlatform: string;
  chooseDuration: string;
  enterKey: string;
  keyAdded: (count: number) => string;
  noKeys: string;
  keyList: (count: number) => string;
  deleteKey: string;
  keyDeleted: string;
  broadcastText: string;
  broadcastPhoto: string;
  broadcastDone: (sent: number, failed: number) => string;
  broadcastSkipped: string;
  cancelled: string;
  back: string;
  oxide: string;
  ios: string;
  android: string;
  oneDay: string;
  week: string;
  month: string;
};

const copies: Record<BotLanguage, AdminCopy> = {
  ru: {
    title: "🛠 Админ-панель AQREH",
    addKey: "➕ Добавить ключ",
    viewKeys: "🔑 Просмотреть / удалить ключи",
    broadcast: "📣 Рассылка",
    chooseGame: "Выберите игру:",
    choosePlatform: "Выберите устройство:",
    chooseDuration: "Выберите срок:",
    enterKey: "Отправьте ключ одним сообщением.\n\n/cancel — отмена",
    keyAdded: (count) => `Ключ добавлен. Сейчас доступно: ${count}.`,
    noKeys: "Ключей для этого варианта пока нет.",
    keyList: (count) => `Ключи в наличии: ${count}. Нажмите на ключ, чтобы удалить его:`,
    deleteKey: "Удалить",
    keyDeleted: "Ключ удалён.",
    broadcastText: "Отправьте текст рассылки.\n\n/cancel — отмена",
    broadcastPhoto: "Текст сохранён. Теперь отправьте фото без подписи, чтобы добавить его, или напишите /skip для рассылки только текста.",
    broadcastDone: (sent, failed) => `Рассылка завершена.\nОтправлено: ${sent}\nОшибок: ${failed}`,
    broadcastSkipped: "Фото пропущено.",
    cancelled: "Действие отменено.",
    back: "↩️ Назад",
    oxide: "OXIDE",
    ios: "iOS",
    android: "Android",
    oneDay: "1 день",
    week: "7 дней",
    month: "30 дней",
  },
  en: {
    title: "🛠 AQREH Admin Panel",
    addKey: "➕ Add key",
    viewKeys: "🔑 View / delete keys",
    broadcast: "📣 Broadcast",
    chooseGame: "Choose a game:",
    choosePlatform: "Choose a device:",
    chooseDuration: "Choose a duration:",
    enterKey: "Send the key in one message.\n\n/cancel — cancel",
    keyAdded: (count) => `Key added. Available now: ${count}.`,
    noKeys: "There are no keys for this option yet.",
    keyList: (count) => `Keys in stock: ${count}. Press a key to delete it:`,
    deleteKey: "Delete",
    keyDeleted: "Key deleted.",
    broadcastText: "Send the broadcast text.\n\n/cancel — cancel",
    broadcastPhoto: "Text saved. Send a photo without a caption to attach it, or type /skip to broadcast text only.",
    broadcastDone: (sent, failed) => `Broadcast complete.\nSent: ${sent}\nFailed: ${failed}`,
    broadcastSkipped: "Photo skipped.",
    cancelled: "Action cancelled.",
    back: "↩️ Back",
    oxide: "OXIDE",
    ios: "iOS",
    android: "Android",
    oneDay: "1 Day",
    week: "7 Days",
    month: "30 Days",
  },
};

export function getAdminCopy(language: BotLanguage): AdminCopy {
  return copies[language];
}