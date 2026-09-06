---
name: Telegram credentials
description: Secure Telegram bot authorization in this project
---

The Telegram client supports a server-side `TELEGRAM_BOT_TOKEN` secret as a fallback when the Replit Telegram connector cannot be edited or reopened. The token must never be pasted into chat or logged.

**Why:** The project’s connector was already marked added but returned an invalid-token response, while the UI exposed no way to replace its API key.

**How to apply:** Request `TELEGRAM_BOT_TOKEN` through the Replit Secrets flow, then restart the API workflow. Keep connector access as the fallback path when the secret is absent.