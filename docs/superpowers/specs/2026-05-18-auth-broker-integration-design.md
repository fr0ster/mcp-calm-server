# Auth-broker integration — design

**Date:** 2026-05-18
**Status:** Approved for planning
**Scope:** sub-project #1 of 3 (HTTP transport + discover-script остаточно spec'-уються окремо)

## Problem

`mcp-calm-server` зараз має inline-клас `XsuaaRefresher` у `src/server/buildClient.ts` —
~50 LoC власної XSUAA-логіки, що уміє виключно `client_credentials`. Інші flow
(`authorization_code`, device, OIDC, SAML) не підтримуються.

В екосистемі вже є `@mcp-abap-adt/auth-broker` + `auth-providers` + `auth-stores`
(уже в `devDependencies`), що покривають усі ці сценарії та надають
готовий `ITokenRefresher` через `AuthBroker.createTokenRefresher(destination)`.
`mcp-calm-server` — єдиний пакет у власній екосистемі, що не використовує broker;
це породжує дрейф конвенцій (`CALM_UAA_*` proприєтарний префікс vs `XSUAA_*` broker-convention)
і дублювання логіки refresh/persistence.

## Goal

Замінити `XsuaaRefresher` на `AuthBroker`-based pipeline, який:

1. Дає вибір flow через `CALM_AUTH_FLOW` env або CLI flag.
2. Зберігає `refresh_token` персистентно між запусками (`./{destination}.env`).
3. Для першого логіну використовує існуючий `mcp-auth` CLI з пакета auth-broker.
4. Зберігає back-compat: існуючі `.env` з `CALM_UAA_*` працюють без міграції.

Non-goals (виносяться у наступні sub-проєкти):
- HTTP-transport для MCP-сервера.
- Discover-скрипт.
- Підтримка SSO / device-flow в config-шарі (вони доступні через broker за бажанням, але
  ми не додаємо UX-конфіги для них зараз).

## Architecture

### Token acquisition pipeline (runtime)

```
CalmClient
  └── CalmConnection ── ITokenRefresher ◄── AuthBroker.createTokenRefresher(destination)
                                              │
                                              ├── sessionStore: XsuaaSessionStore | SafeXsuaaSessionStore
                                              └── tokenProvider:
                                                    CALM_AUTH_FLOW=cc → ClientCredentialsProvider
                                                    CALM_AUTH_FLOW=ac → AuthorizationCodeProvider({browser:'none'})
```

`buildClient.ts` стає тонким orchestrator-ом ~30 LoC:
1. Читає `config.authFlow`, `config.destination`, UAA-creds (з env або session-store).
2. Створює provider за flow.
3. Створює session-store (file-based за замовчуванням; in-memory для back-compat shim).
4. Створює `AuthBroker`.
5. `broker.createTokenRefresher(destination)` → передає у `CalmConnection`.

### Initial login pipeline (out-of-process)

Користувач один раз запускає:

```
# auth-code flow (full user scope, opens browser)
npx mcp-auth --service-key ./calm.json --output ./DEFAULT.env --type xsuaa --browser auto

# client-credentials (sb-* technical user)
npx mcp-auth --service-key ./calm.json --output ./DEFAULT.env --type xsuaa --credential
```

Це генерує `./DEFAULT.env` з `XSUAA_*` змінними (включно з `XSUAA_JWT_TOKEN`,
`XSUAA_REFRESH_TOKEN`, `XSUAA_UAA_*`). Цей файл — джерело правди для broker-а.

`mcp-calm-server` сам нічого не запитує і не пише — він тільки споживає.

### Backward-compat shim

Якщо у головному `.env` присутні старі `CALM_UAA_URL` / `CALM_UAA_CLIENT_ID` /
`CALM_UAA_CLIENT_SECRET`, ми **не вимагаємо** від користувача мігрувати на
`DEFAULT.env` + `mcp-auth`. Натомість:

1. Збираємо in-memory `IAuthorizationConfig` з цих змінних.
2. Інстанціюємо `SafeXsuaaSessionStore` (in-memory) і записуємо в неї цей config.
3. Решта pipeline — стандартна: provider за `CALM_AUTH_FLOW`, broker.

Для `cc` це працює так само, як зараз (refresh кожен старт — нормально, токен
коротко-живий і так). Для `ac` shim не підтримується (потрібен persistent
refresh_token → файл) — у цьому випадку config-валидатор кидає помилку з
посиланням на `mcp-auth`.

## Config changes

### `src/server/config.ts`

`ICalmServerConfig` отримує два нові поля:

```ts
authFlow: 'client_credentials' | 'authorization_code';  // default 'client_credentials'
destination: string;                                     // default 'DEFAULT'
```

Нові env vars:
- `CALM_AUTH_FLOW` — `client_credentials` | `authorization_code`. Default: `client_credentials`.
- `CALM_DESTINATION` — рядок-ключ для broker-а. Default: `DEFAULT`.

Існуючі env vars **зберігаються повністю**:
- `CALM_MODE`, `CALM_BASE_URL`, `CALM_API_KEY`, `CALM_TIMEOUT` — без змін.
- `CALM_UAA_URL`, `CALM_UAA_CLIENT_ID`, `CALM_UAA_CLIENT_SECRET` — тепер
  опційні (back-compat shim). Якщо є → in-memory store; якщо нема → file-based.

Валідація:
- `config.ts` валідує тільки enum `CALM_AUTH_FLOW`. Перевірку наявності
  токенів виконує `auth/buildBroker.ts` під час інстанціювання (бо це його
  концерн — чи є `./{destination}.env`, чи є inline UAA-creds). Помилка
  тоді — чітка: `authorization_code requires persistent tokens; run
  'mcp-auth --service-key ./calm.json --output ./DEFAULT.env --type xsuaa --browser auto'`.

### `.env.example`

Додаємо коментовану секцію з прикладами для cc / ac flow + посилання на `mcp-auth`.

### `.gitignore`

Додаємо `/*.env` шаблон (вже може бути покритий `.env`) — мати на увазі `DEFAULT.env`,
`PROD.env`, etc. Перевірити, не зломавши існуючий `.env` ignore.

## Code layout

```
src/server/
  buildClient.ts          ◄── refactored: drops XsuaaRefresher, uses AuthBroker
  config.ts               ◄── adds authFlow, destination fields
  auth/
    buildBroker.ts        ◄── new: assembles AuthBroker from config (~50 LoC)
    legacyEnvShim.ts      ◄── new: detects CALM_UAA_* and wraps SafeXsuaaSessionStore
```

`src/server/auth/buildBroker.ts` — основна нова робота:
- сигнатура: `buildAuthBroker(config: ICalmServerConfig, logger?: ILogger): AuthBroker`
- обирає provider на основі `config.authFlow`
- обирає session-store: legacy shim якщо є inline UAA, інакше `XsuaaSessionStore(cwd, destination)`
- повертає сконструйований broker
- **stdio-safety**: broker-у передається `logger` параметром. У stdio-режимі
  `bin/stdio.ts` передає існуючий `StderrLogger` з `src/server/stderrLogger.ts`
  (див. CLAUDE.md "MCP-stdio reserves stdout"). Без явного logger broker мовчить
  — це безпечний default для library-консумерів.

`src/server/auth/legacyEnvShim.ts` — невелике:
- сигнатура: `buildLegacyShimStore(config): SafeXsuaaSessionStore | null`
- повертає `null` якщо немає inline UAA → caller використовує file-based store
- повертає preloaded SafeXsuaaSessionStore якщо є UAA → caller юзає його

## Dependency changes

`package.json` — переносимо з `devDependencies` у явні залежності:
- `@mcp-abap-adt/auth-broker` → `peerDependencies` (узгоджується з `calm-client`)
- `@mcp-abap-adt/auth-providers` → `peerDependencies`
- `@mcp-abap-adt/auth-stores` → `peerDependencies`

Версії — фіксуємо мінорну планку `^1.0.5` / `^1.0.4` як зараз у dev.

## Tests

### `src/__tests__/unit/server/config.test.ts`

Нові кейси:
- `CALM_AUTH_FLOW` default → `'client_credentials'`
- `CALM_AUTH_FLOW=authorization_code` → typed config поле `authFlow='authorization_code'`
- `CALM_AUTH_FLOW=weird` → throws
- `CALM_DESTINATION` default `'DEFAULT'`, override через env

### `src/__tests__/unit/server/auth/buildBroker.test.ts` (новий файл)

- mock `AuthBroker`, `ClientCredentialsProvider`, `AuthorizationCodeProvider`, store classes
- `cc` flow → `ClientCredentialsProvider` constructed з правильними UAA-creds
- `ac` flow → `AuthorizationCodeProvider({browser:'none'})`
- file-based store коли немає inline UAA
- legacy shim коли inline UAA є

### `src/__tests__/unit/server/auth/legacyEnvShim.test.ts` (новий файл)

- detection: null коли немає `CALM_UAA_*`
- detection: повертає preloaded `SafeXsuaaSessionStore` коли є всі три CALM_UAA_*
- partial CALM_UAA_* → null + warning

### `src/__tests__/unit/server/buildClient.test.ts`

Оновити: замість перевірки `XsuaaRefresher`, перевіряти що `CalmConnection`
отримує `ITokenRefresher` від мокнутого broker-а.

### Integration tests (existing, env-gated)

`src/__tests__/integration/_sandbox.ts` уже надає `describeOAuth2` gate
(`CALM_MODE=oauth2 + CALM_BASE_URL + 3× UAA env` — наш поточний `.env` його
відкриває). Після рефактора ці тести стають acceptance-критерієм:

- `npm test` із live `.env` MUST проходити так само, як до рефактора.
- Окремих integration-тестів для broker-pipeline не пишемо — наявне покриття
  через `describeOAuth2` плюс unit-тести на `buildBroker`/`legacyEnvShim` достатнє.
- Для `ac` flow вручну: запустити `mcp-auth` з service-key, перевірити що
  той самий integration suite проходить без зміни решти `.env`.

## Migration / rollout

Розбиття на етапи — концерн writing-plans, не дизайну. Ключові інваріанти:

- Існуючий `.env` із `CALM_UAA_*` має продовжувати працювати на `cc` flow без
  жодних змін з боку користувача.
- `XsuaaRefresher` видаляється повністю в тому ж landing-моменті, де
  `buildClient.ts` починає використовувати broker (інакше код-дублікат живе
  у дві гілки).
- Жодного breaking change для library-консумерів (`./tools`, `./registry`
  exports) — все локалізовано в `server/`.

## Risks

- **Broker API change.** `AuthBroker.createTokenRefresher` signature змінилася між
  версіями (`^1.0.5` стабільна?). Перевірити changelog auth-broker перед стартом.
- **`XsuaaSessionStore` поведінка з default destination.** Якщо в cwd немає
  `DEFAULT.env` і нема inline UAA — broker кине `FILE_NOT_FOUND`. Треба ловити
  і кидати чітку user-facing помилку (`run 'mcp-auth --service-key ...'`).
- **Test isolation.** Поточний `config.test.ts` уже має проблему з dotenv (фіксили
  попередньо). Нові тести для broker мають теж бути ізольовані від `process.cwd()` —
  використовуємо `tmp` directories або mock `fs`.

## Out of scope (для цього spec-а)

- HTTP-transport (sub-project #2).
- Discover-script (sub-project #3).
- Власна `calm-mcp auth` subкоманда — користуємось `mcp-auth` CLI.
- Підтримка SSO / device-flow на config-шарі — broker їх уміє, але UX не додаємо.
- Шифрування `DEFAULT.env` — стандарт broker-а: plain-text у gitignored файлі.
