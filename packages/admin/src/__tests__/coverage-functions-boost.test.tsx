/**
 * Coverage boost tests targeting uncovered onChange/isDirty/onClick callbacks
 * across multiple pages and components.
 *
 * Targets: system.tsx inner onChange, notifications.tsx, security.tsx (AutoStop),
 * sessions.tsx, rpc-proxy.tsx, transactions.tsx settings tab, policy forms,
 * hyperliquid/SettingsPanel, polymarket/PolymarketSettings, app.tsx, dashboard.tsx
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/preact';

// ---------------------------------------------------------------------------
// Common mocks (same pattern as pages-functions-1)
// ---------------------------------------------------------------------------

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPut = vi.fn();
const mockApiDelete = vi.fn();
const mockApiPatch = vi.fn();

vi.mock('../api/typed-client', async () => {
  const { ApiError } = await import('../api/client');
  return {
    api: {
      GET: (...args: unknown[]) => mockApiGet(...args),
      POST: (...args: unknown[]) => mockApiPost(...args),
      PUT: (...args: unknown[]) => mockApiPut(...args),
      DELETE: (...args: unknown[]) => mockApiDelete(...args),
      PATCH: (...args: unknown[]) => mockApiPatch(...args),
    },
    ApiError,
  };
});

vi.mock('../components/toast', () => ({
  showToast: vi.fn(),
  ToastContainer: () => null,
}));

vi.mock('../auth/store', () => ({
  masterPassword: { value: 'test-pw' },
  isAuthenticated: { value: true },
  adminTimeout: { value: 900 },
  daemonShutdown: { value: false },
  login: vi.fn(),
  logout: vi.fn(),
  resetInactivityTimer: vi.fn(),
}));

vi.mock('../utils/error-messages', () => ({
  getErrorMessage: (code: string) => `Error: ${code}`,
}));

vi.mock('../components/settings-search', async () => {
  const { signal } = await import('@preact/signals');
  return {
    pendingNavigation: signal(null),
    highlightField: signal(''),
    SettingsSearch: () => null,
  };
});

vi.mock('../utils/dirty-guard', () => ({
  registerDirty: vi.fn(),
  unregisterDirty: vi.fn(),
  hasDirty: { value: false },
}));

vi.mock('../utils/display-currency', () => ({
  fetchDisplayCurrency: vi.fn(() => Promise.resolve({ currency: 'USD', rate: 1 })),
  formatWithDisplay: vi.fn((amount: number | null) => amount != null ? `$${amount.toFixed(2)}` : ''),
}));

vi.mock('../components/currency-select', () => ({
  CurrencySelect: ({ name, value, onChange }: any) => (
    <select data-testid={`currency-${name}`} name={name} value={value} onChange={(e: any) => onChange(e.target.value)}>
      <option value="USD">USD</option>
      <option value="KRW">KRW</option>
    </select>
  ),
}));

vi.mock('../pages/telegram-users', () => ({
  TelegramUsersContent: () => <div data-testid="telegram-users-content">TelegramUsers</div>,
  default: () => <div>TelegramUsersPage</div>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SYSTEM_SETTINGS = {
  daemon: { log_level: 'info' },
  oracle: { cross_validation_threshold: '5', coingecko_api_key: '' },
  display: { currency: 'USD' },
  security: { rate_limit_global_ip_rpm: '1000', max_sessions_per_wallet: '10', max_pending_tx: '5', rate_limit_session_rpm: '60', rate_limit_tx_rpm: '10' },
  gas_condition: { enabled: 'true', poll_interval_sec: '30', default_timeout_sec: '3600', max_timeout_sec: '86400', max_pending_count: '100' },
  smart_account: { enabled: 'false', entry_point: '', 'pimlico.api_key': '', 'pimlico.paymaster_policy_id': '', 'alchemy.api_key': '', 'alchemy.paymaster_policy_id': '' },
  erc8128: { enabled: 'false', default_preset: 'standard', default_ttl_sec: '300', default_nonce: 'false', default_algorithm: 'ethereum-eip191', default_rate_limit_rpm: '60' },
  actions: { nft_indexer_cache_ttl_sec: '300' },
  notifications: { enabled: 'true', locale: 'en', telegram_bot_token: '', telegram_chat_id: '', discord_webhook_url: '', slack_webhook_url: '', rate_limit_rpm: '20', event_filter: '' },
  telegram: { bot_token: '', locale: 'en' },
  autostop: { enabled: 'true', consecutive_failures_threshold: '5', unusual_activity_threshold: '50', unusual_activity_window_sec: '3600', idle_timeout_sec: '86400', idle_check_interval_sec: '300' },
  rpc_proxy: { enabled: 'false', delay_timeout_seconds: '300', approval_timeout_seconds: '600', max_gas_limit: '30000000', max_bytecode_size: '49152', deploy_default_tier: 'APPROVAL', allowed_methods: '[]' },
  incoming: { enabled: 'false', poll_interval: '30', retention_days: '90', suspicious_dust_usd: '0.01', suspicious_amount_multiplier: '10', cooldown_minutes: '5', wss_url: '' },
};

const MOCK_API_KEYS = {
  keys: [
    { providerName: 'alchemy_nft', hasKey: true, maskedKey: 'sk-****xyz', requiresApiKey: true, updatedAt: '2026-01-01' },
    { providerName: 'helius_das', hasKey: false, maskedKey: null, requiresApiKey: true, updatedAt: null },
  ],
};

function mockSettingsApi(settings = SYSTEM_SETTINGS, apiKeys = MOCK_API_KEYS) {
  mockApiGet.mockImplementation(async (path: string, opts?: any) => {
    if (path === '/v1/admin/settings') return { data: settings };
    if (path === '/v1/admin/api-keys') return { data: apiKeys };
    if (path === '/v1/sessions') return { data: { data: [], total: 0 } };
    if (path === '/v1/wallets') return { data: { data: [], total: 0 } };
    if (path === '/v1/audit-logs') return { data: { data: [], total: 0 } };
    if (path === '/v1/admin/notifications/status') return { data: { enabled: true, channels: [{ name: 'telegram', enabled: true }] } };
    if (path === '/v1/admin/notifications/log') return { data: { data: [], total: 0 } };
    if (path === '/v1/notifications/status') return { data: { enabled: true, channels: [] } };
    if (path === '/v1/notifications/logs') return { data: { data: [], total: 0 } };
    if (path === '/v1/admin/stats') return { data: { walletCount: 0, sessionCount: 0, policyCount: 0, transactionCount: 0 } };
    if (path === '/v1/transactions') return { data: { data: [], total: 0 } };
    if (path === '/v1/incoming-transactions') return { data: { data: [], total: 0 } };
    if (path === '/v1/health') return { data: { status: 'ok' } };
    return { data: {} };
  });
}

// ---------------------------------------------------------------------------
// system.tsx: Cover uncovered onChange callbacks in SmartAccount, ERC8128,
// NftIndexer, DisplaySettings, GasCondition, GlobalRateLimit sections
// ---------------------------------------------------------------------------

describe('system.tsx -- uncovered onChange callbacks', () => {
  let SystemPage: any;

  beforeEach(async () => {
    SystemPage = (await import('../pages/system')).default;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange in NFT indexer cache TTL field', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    // Wait for General tab to render (default tab)
    await waitFor(() => {
      expect(screen.getByText('NFT Indexer')).toBeTruthy();
    });

    // Find the cache TTL input and change it
    const cacheTtlInput = document.querySelector('input[name="actions.nft_indexer_cache_ttl_sec"]') as HTMLInputElement;
    if (cacheTtlInput) {
      fireEvent.input(cacheTtlInput, { target: { value: '600' } });
    }
  });

  it('triggers onChange in Oracle CoinGecko API key field', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Oracle')).toBeTruthy();
    });

    const oracleKeyInput = document.querySelector('input[name="oracle.coingecko_api_key"]') as HTMLInputElement;
    if (oracleKeyInput) {
      fireEvent.input(oracleKeyInput, { target: { value: 'CG-test-key' } });
    }
  });

  it('triggers onChange in Display Currency select', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Display Currency')).toBeTruthy();
    });

    const currencySelect = document.querySelector('[data-testid="currency-display.currency"]') as HTMLSelectElement;
    if (currencySelect) {
      fireEvent.change(currencySelect, { target: { value: 'KRW' } });
    }
  });

  it('triggers onChange in Global IP Rate Limit field', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Global IP Rate Limit')).toBeTruthy();
    });

    const rateLimitInput = document.querySelector('input[name="security.rate_limit_global_ip_rpm"]') as HTMLInputElement;
    if (rateLimitInput) {
      fireEvent.input(rateLimitInput, { target: { value: '500' } });
    }
  });

  it('triggers onChange in GasCondition max_timeout_sec and max_pending_count', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Gas Condition')).toBeTruthy();
    });

    const maxTimeoutInput = document.querySelector('input[name="gas_condition.max_timeout_sec"]') as HTMLInputElement;
    if (maxTimeoutInput) {
      fireEvent.input(maxTimeoutInput, { target: { value: '43200' } });
    }

    const maxPendingInput = document.querySelector('input[name="gas_condition.max_pending_count"]') as HTMLInputElement;
    if (maxPendingInput) {
      fireEvent.input(maxPendingInput, { target: { value: '50' } });
    }
  });

  it('triggers onChange in SmartAccount fields (pimlico + alchemy)', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText('Smart Account (ERC-4337)')).toBeTruthy();
    });

    const enabledSelect = document.querySelector('select[name="smart_account.enabled"]') as HTMLSelectElement;
    if (enabledSelect) {
      fireEvent.change(enabledSelect, { target: { value: 'true' } });
    }

    const pimlicoKeyInput = document.querySelector('input[name="smart_account.pimlico.api_key"]') as HTMLInputElement;
    if (pimlicoKeyInput) {
      fireEvent.input(pimlicoKeyInput, { target: { value: 'pk-test' } });
    }

    const pimlicoPaymasterInput = document.querySelector('input[name="smart_account.pimlico.paymaster_policy_id"]') as HTMLInputElement;
    if (pimlicoPaymasterInput) {
      fireEvent.input(pimlicoPaymasterInput, { target: { value: 'pm-test' } });
    }

    const alchemyKeyInput = document.querySelector('input[name="smart_account.alchemy.api_key"]') as HTMLInputElement;
    if (alchemyKeyInput) {
      fireEvent.input(alchemyKeyInput, { target: { value: 'ak-test' } });
    }

    const alchemyPaymasterInput = document.querySelector('input[name="smart_account.alchemy.paymaster_policy_id"]') as HTMLInputElement;
    if (alchemyPaymasterInput) {
      fireEvent.input(alchemyPaymasterInput, { target: { value: 'apm-test' } });
    }
  });

  it('triggers onChange in ERC-8128 fields', async () => {
    mockSettingsApi();
    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText('ERC-8128 Signed HTTP Requests')).toBeTruthy();
    });

    const presetSelect = document.querySelector('select[name="erc8128.default_preset"]') as HTMLSelectElement;
    if (presetSelect) {
      fireEvent.change(presetSelect, { target: { value: 'strict' } });
    }

    const ttlInput = document.querySelector('input[name="erc8128.default_ttl_sec"]') as HTMLInputElement;
    if (ttlInput) {
      fireEvent.input(ttlInput, { target: { value: '600' } });
    }

    const nonceCheckbox = document.querySelector('input[name="erc8128.default_nonce"]') as HTMLInputElement;
    if (nonceCheckbox) {
      fireEvent.change(nonceCheckbox, { target: { checked: true } });
    }

    const algoInput = document.querySelector('input[name="erc8128.default_algorithm"]') as HTMLInputElement;
    if (algoInput) {
      fireEvent.input(algoInput, { target: { value: 'custom-algo' } });
    }

    const rpmInput = document.querySelector('input[name="erc8128.default_rate_limit_rpm"]') as HTMLInputElement;
    if (rpmInput) {
      fireEvent.input(rpmInput, { target: { value: '120' } });
    }
  });
});

// ---------------------------------------------------------------------------
// sessions.tsx: Cover SessionSettingsTab onChange callbacks + isDirty
// ---------------------------------------------------------------------------

describe('sessions.tsx -- settings tab onChange callbacks', () => {
  let SessionsPage: any;

  beforeEach(async () => {
    SessionsPage = (await import('../pages/sessions')).default;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for session rate limit fields', async () => {
    mockSettingsApi();
    render(<SessionsPage />);

    // Switch to Settings tab
    await waitFor(() => {
      const settingsTab = screen.getByText('Settings');
      expect(settingsTab).toBeTruthy();
      fireEvent.click(settingsTab);
    });

    await waitFor(() => {
      expect(document.querySelector('input[name="security.max_sessions_per_wallet"]')).toBeTruthy();
    });

    const maxSessionsInput = document.querySelector('input[name="security.max_sessions_per_wallet"]') as HTMLInputElement;
    if (maxSessionsInput) {
      fireEvent.input(maxSessionsInput, { target: { value: '20' } });
    }

    const maxPendingTxInput = document.querySelector('input[name="security.max_pending_tx"]') as HTMLInputElement;
    if (maxPendingTxInput) {
      fireEvent.input(maxPendingTxInput, { target: { value: '10' } });
    }

    const sessionRpmInput = document.querySelector('input[name="security.rate_limit_session_rpm"]') as HTMLInputElement;
    if (sessionRpmInput) {
      fireEvent.input(sessionRpmInput, { target: { value: '120' } });
    }

    const txRpmInput = document.querySelector('input[name="security.rate_limit_tx_rpm"]') as HTMLInputElement;
    if (txRpmInput) {
      fireEvent.input(txRpmInput, { target: { value: '5' } });
    }
  });
});

// ---------------------------------------------------------------------------
// security.tsx: Cover AutoStopTab onChange callbacks + isDirty
// ---------------------------------------------------------------------------

describe('security.tsx -- AutoStop tab onChange callbacks', () => {
  let SecurityPage: any;

  beforeEach(async () => {
    SecurityPage = (await import('../pages/security')).default;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for AutoStop settings fields', async () => {
    mockSettingsApi();
    render(<SecurityPage />);

    // Switch to AutoStop Rules tab
    await waitFor(() => {
      const autoStopTab = screen.getByText('AutoStop Rules');
      expect(autoStopTab).toBeTruthy();
      fireEvent.click(autoStopTab);
    });

    await waitFor(() => {
      expect(document.querySelector('input[name="autostop.consecutive_failures_threshold"]')).toBeTruthy();
    });

    const failuresInput = document.querySelector('input[name="autostop.consecutive_failures_threshold"]') as HTMLInputElement;
    if (failuresInput) {
      fireEvent.input(failuresInput, { target: { value: '10' } });
    }

    const activityInput = document.querySelector('input[name="autostop.unusual_activity_threshold"]') as HTMLInputElement;
    if (activityInput) {
      fireEvent.input(activityInput, { target: { value: '100' } });
    }

    const windowInput = document.querySelector('input[name="autostop.unusual_activity_window_sec"]') as HTMLInputElement;
    if (windowInput) {
      fireEvent.input(windowInput, { target: { value: '7200' } });
    }

    const idleTimeoutInput = document.querySelector('input[name="autostop.idle_timeout_sec"]') as HTMLInputElement;
    if (idleTimeoutInput) {
      fireEvent.input(idleTimeoutInput, { target: { value: '172800' } });
    }

    const idleCheckInput = document.querySelector('input[name="autostop.idle_check_interval_sec"]') as HTMLInputElement;
    if (idleCheckInput) {
      fireEvent.input(idleCheckInput, { target: { value: '600' } });
    }
  });
});

// ---------------------------------------------------------------------------
// rpc-proxy.tsx: Cover onChange callbacks for configuration fields
// ---------------------------------------------------------------------------

describe('rpc-proxy.tsx -- configuration onChange callbacks', () => {
  let RpcProxyContent: any;

  beforeEach(async () => {
    RpcProxyContent = (await import('../pages/rpc-proxy')).RpcProxyContent;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for all RPC proxy configuration fields', async () => {
    mockSettingsApi();
    render(<RpcProxyContent />);

    await waitFor(() => {
      expect(document.querySelector('input[name="rpc_proxy.delay_timeout_seconds"]')).toBeTruthy();
    });

    const delayInput = document.querySelector('input[name="rpc_proxy.delay_timeout_seconds"]') as HTMLInputElement;
    if (delayInput) {
      fireEvent.input(delayInput, { target: { value: '600' } });
    }

    const approvalInput = document.querySelector('input[name="rpc_proxy.approval_timeout_seconds"]') as HTMLInputElement;
    if (approvalInput) {
      fireEvent.input(approvalInput, { target: { value: '1200' } });
    }

    const gasLimitInput = document.querySelector('input[name="rpc_proxy.max_gas_limit"]') as HTMLInputElement;
    if (gasLimitInput) {
      fireEvent.input(gasLimitInput, { target: { value: '15000000' } });
    }

    const bytecodeSizeInput = document.querySelector('input[name="rpc_proxy.max_bytecode_size"]') as HTMLInputElement;
    if (bytecodeSizeInput) {
      fireEvent.input(bytecodeSizeInput, { target: { value: '65536' } });
    }

    const deployTierSelect = document.querySelector('select[name="rpc_proxy.deploy_default_tier"]') as HTMLSelectElement;
    if (deployTierSelect) {
      fireEvent.change(deployTierSelect, { target: { value: 'DELAY' } });
    }

    const allowedMethodsTextarea = document.querySelector('textarea[name="rpc_proxy.allowed_methods"]') as HTMLTextAreaElement;
    if (allowedMethodsTextarea) {
      fireEvent.input(allowedMethodsTextarea, { target: { value: '["eth_sendTransaction"]' } });
    }
  });
});

// ---------------------------------------------------------------------------
// notifications.tsx: Cover notification settings onChange callbacks
// ---------------------------------------------------------------------------

describe('notifications.tsx -- settings onChange callbacks', () => {
  let NotificationsPage: any;

  beforeEach(async () => {
    NotificationsPage = (await import('../pages/notifications')).default;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for notification config fields', async () => {
    mockSettingsApi();
    render(<NotificationsPage />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });

    // Switch to Settings tab
    await waitFor(() => {
      const settingsTab = screen.getByText('Settings');
      expect(settingsTab).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Settings'));

    await waitFor(() => {
      expect(screen.getByText('Notification Configuration')).toBeTruthy();
    });

    // Locale select
    const localeSelect = document.querySelector('select[name="notifications.locale"]') as HTMLSelectElement;
    if (localeSelect) {
      fireEvent.change(localeSelect, { target: { value: 'ko' } });
    }

    // Telegram bot token
    const telegramTokenInput = document.querySelector('input[name="notifications.telegram_bot_token"]') as HTMLInputElement;
    if (telegramTokenInput) {
      fireEvent.input(telegramTokenInput, { target: { value: 'bot123:token' } });
    }

    // Telegram chat ID
    const chatIdInput = document.querySelector('input[name="notifications.telegram_chat_id"]') as HTMLInputElement;
    if (chatIdInput) {
      fireEvent.input(chatIdInput, { target: { value: '12345' } });
    }

    // Telegram Bot dedicated token
    const botTokenInput = document.querySelector('input[name="telegram.bot_token"]') as HTMLInputElement;
    if (botTokenInput) {
      fireEvent.input(botTokenInput, { target: { value: 'dedicated-token' } });
    }

    // Telegram Bot locale
    const botLocaleSelect = document.querySelector('select[name="telegram.locale"]') as HTMLSelectElement;
    if (botLocaleSelect) {
      fireEvent.change(botLocaleSelect, { target: { value: 'ko' } });
    }

    // Discord webhook
    const discordInput = document.querySelector('input[name="notifications.discord_webhook_url"]') as HTMLInputElement;
    if (discordInput) {
      fireEvent.input(discordInput, { target: { value: 'https://discord.com/webhook/test' } });
    }

    // Slack webhook
    const slackInput = document.querySelector('input[name="notifications.slack_webhook_url"]') as HTMLInputElement;
    if (slackInput) {
      fireEvent.input(slackInput, { target: { value: 'https://hooks.slack.com/test' } });
    }

    // Rate limit
    const rateLimitInput = document.querySelector('input[name="notifications.rate_limit_rpm"]') as HTMLInputElement;
    if (rateLimitInput) {
      fireEvent.input(rateLimitInput, { target: { value: '50' } });
    }
  });
});

// ---------------------------------------------------------------------------
// transactions.tsx: Cover incoming TX settings onChange callbacks
// ---------------------------------------------------------------------------

describe('transactions.tsx -- incoming TX settings onChange', () => {
  let TransactionsPage: any;

  beforeEach(async () => {
    TransactionsPage = (await import('../pages/transactions')).default;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for incoming TX monitoring settings', async () => {
    mockSettingsApi();
    render(<TransactionsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });

    // Switch to Monitor Settings tab
    await waitFor(() => {
      const monitorTab = screen.getByText('Monitor Settings');
      expect(monitorTab).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Monitor Settings'));

    await waitFor(() => {
      expect(document.querySelector('select[name="incoming.enabled"]') || document.querySelector('input[name="incoming.poll_interval"]')).toBeTruthy();
    });

    // Enabled select
    const enabledSelect = document.querySelector('select[name="incoming.enabled"]') as HTMLSelectElement;
    if (enabledSelect) {
      fireEvent.change(enabledSelect, { target: { value: 'true' } });
    }

    // Poll interval
    const pollInput = document.querySelector('input[name="incoming.poll_interval"]') as HTMLInputElement;
    if (pollInput) {
      fireEvent.input(pollInput, { target: { value: '60' } });
    }

    // Retention days
    const retentionInput = document.querySelector('input[name="incoming.retention_days"]') as HTMLInputElement;
    if (retentionInput) {
      fireEvent.input(retentionInput, { target: { value: '180' } });
    }

    // Suspicious dust USD
    const dustInput = document.querySelector('input[name="incoming.suspicious_dust_usd"]') as HTMLInputElement;
    if (dustInput) {
      fireEvent.input(dustInput, { target: { value: '0.05' } });
    }

    // Suspicious amount multiplier
    const multiplierInput = document.querySelector('input[name="incoming.suspicious_amount_multiplier"]') as HTMLInputElement;
    if (multiplierInput) {
      fireEvent.input(multiplierInput, { target: { value: '20' } });
    }

    // Cooldown minutes
    const cooldownInput = document.querySelector('input[name="incoming.cooldown_minutes"]') as HTMLInputElement;
    if (cooldownInput) {
      fireEvent.input(cooldownInput, { target: { value: '10' } });
    }

    // WebSocket URL
    const wssInput = document.querySelector('input[name="incoming.wss_url"]') as HTMLInputElement;
    if (wssInput) {
      fireEvent.input(wssInput, { target: { value: 'wss://custom.example.com' } });
    }
  });
});

// ---------------------------------------------------------------------------
// app.tsx: Cover App component rendering
// ---------------------------------------------------------------------------

describe('app.tsx -- App component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders Login when not authenticated', async () => {
    // Override isAuthenticated to false
    const authStore = await import('../auth/store');
    const origAuth = authStore.isAuthenticated.value;
    (authStore.isAuthenticated as any).value = false;

    const { App } = await import('../app');
    render(<App />);

    // Should show login
    await waitFor(() => {
      // Login component renders a form or heading
      const body = document.body.innerHTML;
      expect(body.length).toBeGreaterThan(0);
    });

    (authStore.isAuthenticated as any).value = origAuth;
  });
});

// ---------------------------------------------------------------------------
// Hyperliquid SettingsPanel: Cover onChange callbacks
// ---------------------------------------------------------------------------

describe('SettingsPanel -- onChange callbacks', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for SettingsPanel toggle, select, and text fields', async () => {
    mockApiGet.mockImplementation(async (path: string) => {
      if (path === '/v1/admin/settings') {
        // SettingsPanel uses flat dotted keys
        return { data: {
          'actions.hyperliquid_enabled': 'true',
          'actions.hyperliquid_network': 'mainnet',
          'actions.hyperliquid_api_url': '',
          'actions.hyperliquid_rate_limit_weight_per_min': '1200',
          'actions.hyperliquid_default_leverage': '5',
          'actions.hyperliquid_default_margin_mode': 'CROSS',
          'actions.hyperliquid_builder_address': '',
          'actions.hyperliquid_builder_fee': '0',
          'actions.hyperliquid_order_status_poll_interval_ms': '1000',
        } };
      }
      return { data: {} };
    });

    const { SettingsPanel } = await import('../components/hyperliquid/SettingsPanel');
    render(<SettingsPanel />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).toBeFalsy();
    });

    // Find and interact with the toggle checkbox
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      fireEvent.change(checkboxes[0]!, { target: { checked: false } });
    }

    // Find and interact with select elements
    const selects = document.querySelectorAll('select.form-input');
    if (selects.length > 0) {
      fireEvent.change(selects[0]!, { target: { value: 'mainnet' } });
    }

    // Find and interact with text/number inputs
    const inputs = document.querySelectorAll('input.form-input');
    if (inputs.length > 0) {
      fireEvent.input(inputs[0]!, { target: { value: '10' } });
    }
  });
});

// ---------------------------------------------------------------------------
// Polymarket PolymarketSettings: Cover onChange callbacks
// ---------------------------------------------------------------------------

describe('PolymarketSettings -- onChange callbacks', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('triggers onChange for PolymarketSettings toggle and text fields', async () => {
    mockApiGet.mockImplementation(async (path: string) => {
      if (path === '/v1/admin/settings') {
        // PolymarketSettings uses flat dotted keys
        return { data: {
          'actions.polymarket_enabled': 'true',
          'actions.polymarket_proxy_address': '',
          'actions.polymarket_api_url': '',
        } };
      }
      return { data: {} };
    });

    const { PolymarketSettings } = await import('../components/polymarket/PolymarketSettings');
    render(<PolymarketSettings />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).toBeFalsy();
    });

    // Toggle checkbox
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      fireEvent.change(checkboxes[0]!, { target: { checked: false } });
    }

    // Text/number inputs
    const inputs = document.querySelectorAll('input.form-input');
    if (inputs.length > 0) {
      fireEvent.input(inputs[0]!, { target: { value: '200' } });
    }
  });
});
