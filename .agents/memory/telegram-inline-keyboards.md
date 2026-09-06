---
name: Telegram inline keyboards
description: Reliable startup rendering of inline buttons in the Telegram bot
---

The startup language selector should send its inline keyboard with the initial Telegram message. Avoid sending the message with `ReplyKeyboardRemove` and immediately editing it to add inline markup, because Telegram clients can render the message without the language buttons.

**Why:** The previous two-step flow caused the first language selector to appear without its inline buttons.

**How to apply:** Preserve the direct `inline_keyboard` send for startup selectors. If legacy reply keyboards must also be removed later, implement and verify that as a separate Telegram-specific flow without regressing initial inline markup.