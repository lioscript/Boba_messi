# OXIDE Store Telegram Bot

Telegram-магазин для навігації по продуктах OXIDE, профілю користувача та майбутньої видачі ключів.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Telegram is connected through the Replit Telegram connector. The bot starts polling automatically with the API server.
- Inline navigation uses Telegram callback queries; set `TELEGRAM_CUSTOM_EMOJI_IDS` to a JSON map of custom emoji IDs for branded message entities.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/telegram/bot.ts` — Telegram polling loop and menu routing
- `artifacts/api-server/src/telegram/client.ts` — authenticated Telegram API client
- `artifacts/api-server/src/telegram/i18n.ts` — Russian and English copy
- `artifacts/api-server/src/telegram/store.ts` — user profile and purchase history persistence
- `lib/db/src/schema/index.ts` — PostgreSQL tables for Telegram users and purchases

## Architecture decisions

- Telegram access uses the Replit connector SDK rather than a raw bot token in application code.
- Long polling is used for the initial MVP so the bot works without a public webhook URL.
- Product plans are intentionally visible but unavailable until inventory and payment flows are configured.
- User language, registration date, balance, and purchase history are stored in PostgreSQL.

## Product

The bot lets customers select Russian or English, browse OXIDE for iOS, view an account profile, and open an empty purchase-history screen. Reviews, referrals, support, Android, and product plans are temporarily unavailable.

## User preferences

- The interface should follow the provided green Telegram storefront references and use decorative premium-style emoji/sticker treatment.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
