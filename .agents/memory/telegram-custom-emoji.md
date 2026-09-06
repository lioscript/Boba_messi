---
name: Telegram custom emoji entities
description: Formatting constraints for premium custom emoji in Telegram messages
---

When sending a Telegram `custom_emoji` entity, the entity must cover a valid emoji placeholder in the message text, and offsets/lengths must use UTF-16 code units. An arbitrary symbol can make Telegram reject the whole message with `ENTITY_TEXT_INVALID`.

**Why:** The first multi-emoji implementation used a generic star placeholder and Telegram rejected the startup message.

**How to apply:** Use a valid emoji placeholder for each custom-emoji placement and calculate offsets from JavaScript string lengths. Keep custom emoji entities in message text; inline button labels cannot carry message entities.