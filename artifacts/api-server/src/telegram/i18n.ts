export type BotLanguage = "ru" | "en";

type Copy = {
  welcome: (firstName: string) => string;
  welcomeDetails: string;
  chooseSection: string;
  products: string;
  profile: string;
  myKeys: string;
  topUpBalance: string;
  reviews: string;
  referrals: string;
  support: string;
  language: string;
  chooseProduct: string;
  oxiDe: string;
  back: string;
  choosePlatform: string;
  ios: string;
  androidSoon: string;
  choosePlan: string;
  planDetails: string;
  unavailable: string;
  outOfStock: string;
  profileDetails: (user: {
    telegramId: string;
    firstName: string;
    username?: string | null;
    language: BotLanguage;
    registeredAt: Date;
    purchasesCount: number;
    balanceRoubles: number;
  }) => string;
  emptyKeys: string;
  unavailableSection: string;
  languageChanged: string;
};

const copies: Record<BotLanguage, Copy> = {
  ru: {
    welcome: (firstName) => `Добро пожаловать, ${firstName}!`,
    welcomeDetails:
      "✓ Мгновенная активация после оплаты\n🔒 Доступ к приватному VIP-разделу\n⚡ Поддержка 24/7",
    chooseSection: "Выберите раздел ниже",
    products: "💎  Продукты",
    profile: "👤  Профиль",
    myKeys: "🔐  Мои ключи",
    topUpBalance: "💳  Пополнить баланс",
    reviews: "⭐  Отзывы",
    referrals: "💎  Рефералы",
    support: "☎️  Поддержка",
    language: "🌙  Язык / Language",
    chooseProduct: "💎 ПРОДУКТЫ\n\nВыберите продукт, чтобы увидеть доступные тарифы.",
    oxiDe: "💎  OXIDE",
    back: "↩️  Назад",
    choosePlatform: "💎 OXIDE\n\n⚡ Выберите платформу:",
    ios: "🔒  iOS",
    androidSoon: "ⓘ  Android — скоро",
    choosePlan:
      "💎 OXIDE iOS\n\n⚡ Выберите тариф.\n\n✓ Функции:\n— Aim · Silent aim\n— Player ESP · Animal ESP\n— Resource ESP (ore)\n— Loot box & cupboard ESP\n— Day/night switch · NoClip\n\n💳 Оплата будет доступна после добавления товара.",
    planDetails: "OXIDE iOS",
    unavailable: "Сейчас ничего нет в наличии.\n\nМы добавим тарифы, как только товар будет готов.",
    outOfStock: "нет в наличии",
    profileDetails: ({ telegramId, firstName, username, language, registeredAt, purchasesCount, balanceRoubles }) =>
      `👤 МОЙ ПРОФИЛЬ\n\nⓘ ID: ${telegramId}\n👤 Имя: ${firstName}${username ? `\n@${username}` : ""}\n🌙 Язык: ${language === "ru" ? "Русский" : "English"}\n📅 Регистрация: ${formatDate(registeredAt)}\n\n🗃 Покупки: ${purchasesCount}\n💳 Баланс: ${balanceRoubles} ₽\n\n🔒 Документы:\nПолитика конфиденциальности\nУсловия использования`,
    emptyKeys: "🔐 МОИ КЛЮЧИ\n\nИстория покупок пока пуста.",
    unavailableSection: "Раздел временно недоступен.\n\nМы сообщим, когда он будет активирован.",
    languageChanged: "Язык изменён.",
  },
  en: {
    welcome: (firstName) => `Welcome, ${firstName}!`,
    welcomeDetails:
      "✓ Instant activation after payment\n🔒 Private VIP section access\n⚡ 24/7 Support",
    chooseSection: "Select a section below",
    products: "💎  Products",
    profile: "👤  Profile",
    myKeys: "🔐  My keys",
    topUpBalance: "💳  Top up balance",
    reviews: "⭐  Reviews",
    referrals: "💎  Referrals",
    support: "☎️  Support",
    language: "🌙  Язык / Language",
    chooseProduct: "💎 PRODUCTS\n\nSelect a product to view available plans.",
    oxiDe: "💎  OXIDE",
    back: "↩️  Back",
    choosePlatform: "💎 OXIDE\n\n⚡ Choose your platform:",
    ios: "🔒  iOS",
    androidSoon: "ⓘ  Android — soon",
    choosePlan:
      "💎 OXIDE iOS\n\n⚡ Choose a plan.\n\n✓ Features:\n— Aim · Silent aim\n— Player ESP · Animal ESP\n— Resource ESP (ore)\n— Loot box & cupboard ESP\n— Day/night switch · NoClip\n\n💳 Payment will be enabled after products are added.",
    planDetails: "OXIDE iOS",
    unavailable: "Nothing is available right now.\n\nPlans will appear here as soon as the product is ready.",
    outOfStock: "out of stock",
    profileDetails: ({ telegramId, firstName, username, language, registeredAt, purchasesCount, balanceRoubles }) =>
      `👤 MY PROFILE\n\nⓘ ID: ${telegramId}\n👤 Name: ${firstName}${username ? `\n@${username}` : ""}\n🌙 Language: ${language === "ru" ? "Русский" : "English"}\n📅 Registered: ${formatDate(registeredAt)}\n\n🗃 Purchases: ${purchasesCount}\n💳 Balance: ${balanceRoubles} ₽\n\n🔒 Documents:\nPrivacy Policy\nTerms of Service`,
    emptyKeys: "🔐 MY KEYS\n\nYour purchase history is empty for now.",
    unavailableSection: "This section is temporarily unavailable.\n\nWe will let you know when it is activated.",
    languageChanged: "Language changed.",
  },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(date);
}

export function getCopy(language: BotLanguage): Copy {
  return copies[language];
}

export function isBotLanguage(value: string | undefined): value is BotLanguage {
  return value === "ru" || value === "en";
}