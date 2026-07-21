/**
 * CT-4: INotificationChannel Contract Test -- TelegramChannel execution.
 *
 * Validates that TelegramChannel (with msw-mocked Telegram API) passes
 * the same shared contract suite as MockNotificationChannel.
 *
 * Uses msw (Mock Service Worker) to intercept Telegram Bot API calls.
 */
import { describe, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { notificationChannelContractTests } from '../../../../core/src/__tests__/contracts/notification-channel.contract.js';
import { TelegramChannel } from '../../notifications/channels/telegram.js';

// ---------------------------------------------------------------------------
// msw server for Telegram Bot API
// ---------------------------------------------------------------------------

const telegramHandlers = [
  http.post('https://api.telegram.org/bot:token/sendMessage', () => {
    return HttpResponse.json({ ok: true, result: { message_id: 1 } });
  }),
];

const server = setupServer(...telegramHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Run contract tests
// ---------------------------------------------------------------------------

describe('CT-4: INotificationChannel Contract Tests (daemon implementations)', () => {
  describe('TelegramChannel (msw-mocked)', () => {
    const telegramConfig = {
      telegram_bot_token: 'test-bot-token-ct4',
      telegram_chat_id: '12345',
    };

    notificationChannelContractTests(
      async () => {
        const ch = new TelegramChannel();
        await ch.initialize(telegramConfig);
        return ch;
      },
      { initConfig: telegramConfig },
    );
  });
});
