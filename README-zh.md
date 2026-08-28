# Microsoft-Rewards-Script（中文 Fork 版）

[![Discord](https://img.shields.io/badge/Join%20Our%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/8BxYbV4pkj)
[![Latest Build](https://img.shields.io/github/actions/workflow/status/TheNetsky/Microsoft-Rewards-Script/auto-release.yml?branch=v4&style=for-the-badge&label=Latest%20Build)](https://github.com/TheNetsky/Microsoft-Rewards-Script/actions/workflows/auto-release.yml)
[![Docker](https://img.shields.io/badge/Docker-GHCR-blue?style=for-the-badge&logo=docker)](https://github.com/TheNetsky/Microsoft-Rewards-Script/pkgs/container/microsoft-rewards-script)

> [!TIP]
> 本版本仅支持**新版 Bing Rewards 仪表盘**，**不支持**旧版仪表盘。
> 如果你的账号仍在使用旧版仪表盘，请使用 [v3 分支](https://github.com/TheNetsky/Microsoft-Rewards-Script/tree/v3) 及 v3.x 版本！
>
> 使用风险自负 - 部分功能可能无法按预期工作。

---

## 关于本 Fork

本项目是 [TheNetsky/Microsoft-Rewards-Script](https://github.com/TheNetsky/Microsoft-Rewards-Script) v4 的 Fork 版本，在原版基础上做了以下修改：

1. **中文日志显示** - Docker 日志及脚本运行日志等使用中文显示，方便中文用户阅读和排查问题。
2. **PushPlus 推送支持** - 新增 [PushPlus](http://www.pushplus.plus/) 通知渠道，支持通过微信公众号接收运行状态推送。
3. **其他功能与原版保持一致** - 除上述修改外，所有功能、配置项、工作流程均与上游 v4 版本保持一致。

> [!NOTE]
> 本 Fork **不包含**中国区搜索词功能。搜索词来源与原版一致，使用 Google Trends、Wikipedia、Hacker News、Reddit 等国际源。

---

## 目录

- [关于本 Fork](#关于本-fork)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
    - [Docker 方式（推荐）](#docker-方式推荐)
    - [本地运行方式](#本地运行方式)
- [账号配置](#账号配置)
- [配置文件说明](#配置文件说明)
    - [本地构建并运行脚本](#本地构建并运行脚本)
- [Docker 部署详细说明](#docker-部署详细说明)
- [Control API 与仪表盘](#control-api-与仪表盘)
- [Nix 配置](#nix-配置)
- [配置选项](#配置选项)
    - [核心配置（Core）](#核心配置core)
    - [工作任务（Workers）](#工作任务workers)
    - [活动（Activities）](#活动activities)
    - [搜索设置（Search Settings）](#搜索设置search-settings)
        - [搜索词来源](#搜索词来源)
    - [实验性功能（Experimental）](#实验性功能experimental)
        - [Edge 浏览计时与进度](#edge-浏览计时与进度)
        - [活动源代码结构](#活动源代码结构)
    - [日志（Logging）](#日志logging)
    - [代理（Proxy）](#代理proxy)
    - [Webhook 通知](#webhook-通知)
        - [Discord](#discord)
        - [Telegram](#telegram)
        - [ntfy](#ntfy)
        - [PushPlus（本 Fork 新增）](#pushplus本-fork-新增)
- [常见问题](#常见问题)
    - [会话管理](#会话管理)
- [致谢与许可](#致谢与许可)
- [免责声明](#免责声明)

---

## 功能特性

- **自动完成每日任务** - 每日任务集（Daily Set）、更多推广活动（More Promotions）、打卡任务（Punch Cards）等自动完成。
- **自动搜索积分** - 自动完成桌面端和移动端的 Bing 搜索任务，获取积分奖励。
- **自动领取奖励** - 自动领取奖励积分、打卡奖励等。
- **每日签到** - 自动完成每日签到（Daily Check-in）。
- **Read-to-Earn** - 自动完成"阅读赚取"活动。
- **多账号支持** - 支持配置多个 Microsoft 账号，可设置并发集群（clusters）。
- **2FA 支持** - 支持 TOTP 双因素认证，自动生成并输入验证码。
- **代理支持** - 支持 HTTP/HTTPS/SOCKS4/SOCKS5 代理。
- **多种通知渠道** - 支持 Discord、Telegram、ntfy 以及 **PushPlus**（本 Fork 新增）推送通知。
- **中文日志** - Docker 容器日志及脚本运行日志使用中文显示，便于中文用户阅读。
- **Docker 部署** - 支持 Docker Compose 一键部署，自动定时运行。
- **Control API** - 可选的 HTTP 控制 API，支持通过接口监控和控制脚本运行。
- **会话持久化** - 浏览器会话自动保存，减少重复登录。

---

## 快速开始

### Docker 方式（推荐）

Docker 是最简单的部署方式，推荐大多数用户使用。

**前置要求：** 已安装 Docker 和 Docker Compose。

1. 复制示例 [`compose.yaml`](compose.yaml) 文件到你的部署目录。
2. 复制并重命名 [`env.example`](env.example) 为 `.env`，填入你的账号凭据：

```env
ACCOUNT_1_EMAIL=email@example.com
ACCOUNT_1_PASSWORD=your_password
```

3. 检查 `compose.yaml`，调整定时计划、时区和配置选项。
4. 启动容器：

```bash
docker compose up -d
```

> [!TIP]
> 使用 `docker logs microsoft-rewards-script` 查看日志，可用于查看无密码登录验证码或诊断问题。
> 你也可以在 `compose.yaml` 中启用 Webhook 来接收通知推送。

详细说明请参考 [Docker 部署详细说明](#docker-部署详细说明)。

### 本地运行方式

**前置要求：** Node.js >= 24 和 Git。
支持 Windows、Linux、macOS 和 WSL。

#### 获取脚本

```bash
git clone https://github.com/TheNetsky/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
```

或者下载最新版本的 ZIP 压缩包并解压。

然后按照 [账号配置](#账号配置) 和 [配置文件说明](#配置文件说明) 进行设置。

---

## 账号配置

账号凭据通过环境变量配置。复制并重命名 [`env.example`](env.example) 为 `.env`，填入你的账号信息：

```env
ACCOUNT_1_EMAIL=email@example.com
ACCOUNT_1_PASSWORD=your_password
```

> [!NOTE]
> 每个账号添加一个 `ACCOUNT_N_*` 配置块。账号编号不需要连续：即使前面的编号缺失，也可以配置 `ACCOUNT_2` 或 `ACCOUNT_4`。账号按编号升序依次运行。可选的每账号字段包括恢复邮箱、区域设置、语言、代理和指纹持久化 - 详见 [`env.example`](env.example)。

`ACCOUNT_N_LANG_CODE` 接受 BCP 47 语言标签，例如 `nl`、`it` 或 `pt-BR`。`ACCOUNT_N_GEO_LOCALE` 接受两位国家代码，默认为 `auto`。所选语言和国家会一致地应用到浏览器指纹、`Accept-Language`、Microsoft Rewards 应用请求头和特定市场的请求中。在 `auto` 模式下，首次成功的仪表盘请求后会缓存 Microsoft 账号配置中报告的国家；更改任一区域设置会自动替换不兼容的已保存指纹。

> [!TIP]
> 对于启用了 2FA 的账号，设置 `ACCOUNT_N_TOTP_SECRET`，脚本会自动生成并输入 6 位验证码。获取密钥的方法：在 Microsoft 安全设置中打开"管理登录方式"，添加一个身份验证器应用，当二维码出现时选择"手动输入代码" - 使用该代码作为 `.env` 中的值。

> [!WARNING]
> 修改 `.env` 后必须重新构建脚本。

---

## 配置文件说明

> [!WARNING]
> 如果你以本地方式（bare metal）运行脚本，**不要**跳过此步骤。

- **本地运行：** 复制或重命名 `config.example.json` 为 `config.json`（放在项目根目录），并自定义你的偏好设置。
- **Docker：** 首次运行时会自动创建有效的 `config.json` 并保存到 `./config/` 目录。你也可以手动创建 `config.json`（例如需要指定正则表达式值时），使用提供的 `config.example.json` 作为模板。

> [!CAUTION]
> 旧版本的 accounts.json 和 config.json 与当前版本不兼容。

### 本地构建并运行脚本

```bash
npm run pre-build
npm run build
npm run start
```

---

## Docker 部署详细说明

### 1. 准备文件

将 [`compose.yaml`](compose.yaml) 和 [`env.example`](env.example) 复制到你的部署目录，并将 `env.example` 重命名为 `.env`。

### 2. 配置账号

编辑 `.env` 文件，填入你的 Microsoft 账号凭据：

```env
ACCOUNT_1_EMAIL=email@example.com
ACCOUNT_1_PASSWORD=your_password
```

如需配置多个账号，添加 `ACCOUNT_2_*`、`ACCOUNT_3_*` 等配置块。

### 3. 调整 compose.yaml

检查 `compose.yaml` 中的以下关键配置：

```yaml
services:
    microsoft-rewards-script:
        image: ghcr.io/thenetsky/microsoft-rewards-script:4
        container_name: microsoft-rewards-script
        restart: unless-stopped
        volumes:
            - ./config:/usr/src/microsoft-rewards-script/config
            - ./sessions:/usr/src/microsoft-rewards-script/sessions
        env_file:
            - path: .env
        environment:
            # ── 调度器 ──────────────────────────────────────
            TZ: 'America/Toronto' # 时区，中国用户可设为 'Asia/Shanghai'
            NODE_ENV: 'production'
            CRON_SCHEDULE: '0 7 * * *' # 定时计划，使用 crontab.guru 自定义
            RUN_ON_START: 'true' # 容器启动时立即运行一次
            SKIP_RANDOM_SLEEP: 'false'
        healthcheck:
            test: ['CMD-SHELL', 'scripts/docker/healthcheck.sh']
            interval: 60s
            timeout: 5s
            retries: 3
            start_period: 30s
        security_opt:
            - no-new-privileges:true
```

### 4. 配置说明

> [!NOTE]
> 首次运行时会使用默认值自动生成 `config.json`，并保存到 `./config/` 目录。
> 你可以在 `compose.yaml` 的 `environment:` 部分使用 `CONFIG_*` 变量自定义选项（如集群数、Webhook 等）。
> 完整的可用选项列表见 [配置选项](#配置选项) 表格。
> `CONFIG_*` 变量在每次启动时都会应用，并且始终优先于 `./config/config.json` 中的设置。

> [!TIP]
> 如果新镜像添加了你缺少的配置选项，容器日志中会出现警告。
> 要更新配置，删除 `./config/config.json` 并重启 - 会从最新的示例文件重新生成，并重新应用 `compose.yaml` 中的覆盖设置。

### 5. 启动容器

```bash
docker compose up -d
```

### 6. 查看日志

```bash
# 查看实时日志
docker logs -f microsoft-rewards-script

# 查看最近 100 行日志
docker logs --tail 100 microsoft-rewards-script
```

> [!TIP]
> 本 Fork 的日志使用中文显示，便于中文用户阅读和排查问题。
> 查看日志对于获取无密码登录验证码或诊断运行问题非常有用。

### 7. 使用 PushPlus 推送通知（可选）

在 `compose.yaml` 的 `environment:` 部分添加 PushPlus 配置：

```yaml
environment:
    # ── PushPlus 推送（本 Fork 新增）──────────────────
    CONFIG_PUSHPLUS_ENABLED: 'true'
    CONFIG_PUSHPLUS_TOKEN: '你的pushplus_token'
    CONFIG_PUSHPLUS_TITLE: 'Microsoft-Rewards-Script'
    CONFIG_PUSHPLUS_TEMPLATE: 'txt'
    # CONFIG_PUSHPLUS_CHANNEL: ''
    # CONFIG_PUSHPLUS_WEBHOOK: ''
```

---

## Control API 与仪表盘

可选的 Control API 允许本地仪表盘或其他受信任的工具通过 HTTP 监控和控制脚本。完整的 Control API 文档请参见 [scripts/api/README.md](scripts/api/README.md)，包含设置、认证、每个端点、请求字段、响应示例和安全指南。

常见用途包括：

- 使用 `GET /health` 和 `GET /status` 检查 API 健康状态和当前运行状态；
- 读取实时积分、日志、错误、账号摘要、运行历史和错误诊断；
- 列出已存储的会话元数据，并删除某个账号的移动端/桌面端会话；
- 使用 `POST /start` 和空 JSON 体启动所有账号；
- 使用 `POST /start` 和 `{"accountIndex":2}` 仅运行一个账号；
- 使用 `POST /start` 和 `{"excludedAccountIndexes":[2,4]}` 运行除指定编号外的所有账号；
- 使用 `POST /stop` 或 `POST /restart` 停止或重启运行；
- 使用 Server-Sent Events (SSE) 从 `GET /events` 流式获取实时日志和状态更新；
- 读取当前配置和计划，配置和计划更改仅在其对应的 `API_ALLOW_*` 选项启用时可用。

例如，使用 cURL 仅启动 `ACCOUNT_2`：

```bash
curl --request POST \
  --url http://127.0.0.1:3010/start \
  --header 'Authorization: Bearer YOUR_API_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"accountIndex":2}'
```

如需现成的 Web 界面，可以使用受支持的 [Rewards Dashboard](https://github.com/mgrimace/rewards-dashboard)。它连接到本 Control API 来管理运行、账号、计划、日志、积分和相关脚本设置。

---

## Nix 配置

如果使用 Nix：`bash scripts/nix/run.sh`

---

## 配置选项

编辑 `config.json` 自定义行为，或在 `compose.yaml`（Docker）中设置 `CONFIG_*` 环境变量。以下是当前所有可用选项。

> [!WARNING]
> 所有配置更改后，需要重新构建脚本（本地运行）或重建容器（Docker）。

### 核心配置（Core）

| 设置项                      | 类型    | 默认值       | 说明                                                | Docker 环境变量                       |
| --------------------------- | ------- | ------------ | --------------------------------------------------- | ------------------------------------- |
| `sessionPath`               | string  | `"sessions"` | 存储浏览器会话的目录                                |                                       |
| `headless`                  | boolean | `false`      | 无头模式运行浏览器（不可见）                        | Docker 中始终为 `true`                |
| `clusters`                  | number  | `1`          | 并发账号集群数                                      | `CONFIG_CLUSTERS`                     |
| `errorDiagnostics`          | boolean | `false`      | 将错误和未知登录页面的诊断信息保存到 `diagnostics/` | `CONFIG_ERROR_DIAGNOSTICS`            |
| `ensureStreakProtection`    | boolean | `true`       | 确保已启用连续打卡保护                              | `CONFIG_ENSURE_STREAK_PROTECTION`     |
| `autoClaimPunchcardRewards` | boolean | `false`      | 自动领取已完成的打卡奖励                            | `CONFIG_AUTO_CLAIM_PUNCHCARD_REWARDS` |
| `skipNonPointTasks`         | boolean | `true`       | 跳过不奖励积分的任务                                | `CONFIG_SKIP_NON_POINT_TASKS`         |
| `accountDelay.min`          | string  | `"1min"`     | 启动下一个配置账号的最小延迟                        | `CONFIG_ACCOUNT_DELAY_MIN`            |
| `accountDelay.max`          | string  | `"3min"`     | 启动下一个配置账号的最大延迟                        | `CONFIG_ACCOUNT_DELAY_MAX`            |
| `searchOnBingLocalQueries`  | boolean | `false`      | 对 ExploreOnBing 使用本地搜索词列表                 | `CONFIG_SEARCH_ON_BING_LOCAL`         |
| `globalTimeout`             | string  | `"30sec"`    | 所有操作的超时时间                                  | `CONFIG_GLOBAL_TIMEOUT`               |

### 工作任务（Workers）

| 设置项                         | 类型    | 默认值  | 说明                                              | Docker 环境变量                      |
| ------------------------------ | ------- | ------- | ------------------------------------------------- | ------------------------------------ |
| `workers.doDailySet`           | boolean | `true`  | 完成每日任务集                                    | `CONFIG_WORKER_DAILY_SET`            |
| `workers.doClaimBonusPoints`   | boolean | `true`  | 领取奖励积分                                      | `CONFIG_WORKER_CLAIM_BONUS_POINTS`   |
| `workers.doMorePromotions`     | boolean | `true`  | 完成"更多活动"                                    | `CONFIG_WORKER_MORE_PROMOTIONS`      |
| `workers.doPunchCards`         | boolean | `true`  | 完成打卡任务                                      | `CONFIG_WORKER_PUNCH_CARDS`          |
| `workers.doAppPromotions`      | boolean | `true`  | 完成应用推广活动                                  | `CONFIG_WORKER_APP_PROMOTIONS`       |
| `workers.doDesktopSearch`      | boolean | `true`  | 执行桌面端搜索                                    | `CONFIG_WORKER_DESKTOP_SEARCH`       |
| `workers.doMobileSearch`       | boolean | `true`  | 执行移动端搜索                                    | `CONFIG_WORKER_MOBILE_SEARCH`        |
| `workers.doBonusSearches`      | boolean | `false` | 超出上限后继续刷额外搜索                          | `CONFIG_WORKER_BONUS_SEARCHES`       |
| `workers.doDailyCheckIn`       | boolean | `true`  | 完成每日签到                                      | `CONFIG_WORKER_DAILY_CHECKIN`        |
| `workers.doReadToEarn`         | boolean | `true`  | 完成"阅读赚取"                                    | `CONFIG_WORKER_READ_TO_EARN`         |
| `workers.doActivateSearchPerk` | boolean | `true`  | 出现时激活"再搜索 N 次"特权（在每日任务集后运行） | `CONFIG_WORKER_ACTIVATE_SEARCH_PERK` |
| `workers.doVisualSearch`       | boolean | `false` | 激视觉搜索连续打卡并执行视觉搜索                  | `CONFIG_WORKER_VISUAL_SEARCH`        |

### 活动（Activities）

| 设置项                    | 类型    | 默认值 | 说明                    | Docker 环境变量                  |
| ------------------------- | ------- | ------ | ----------------------- | -------------------------------- |
| `activities.urlReward`    | boolean | `true` | 完成 URL 奖励活动       | `CONFIG_ACTIVITY_URL_REWARD`     |
| `activities.searchOnBing` | boolean | `true` | 完成 ExploreOnBing 活动 | `CONFIG_ACTIVITY_SEARCH_ON_BING` |

### 搜索设置（Search Settings）

| 设置项                                 | 类型     | 默认值                       | 说明                                                 | Docker 环境变量                    |
| -------------------------------------- | -------- | ---------------------------- | ---------------------------------------------------- | ---------------------------------- |
| `searchSettings.scrollRandomResults`   | boolean  | `false`                      | 随机滚动搜索结果                                     | `CONFIG_SEARCH_SCROLL_RANDOM`      |
| `searchSettings.clickRandomResults`    | boolean  | `false`                      | 随机点击搜索结果链接                                 | `CONFIG_SEARCH_CLICK_RANDOM`       |
| `searchSettings.runOnZeroPoints`       | boolean  | `false`                      | 即使没有剩余搜索积分也执行搜索                       | `CONFIG_SEARCH_RUN_ON_ZERO_POINTS` |
| `searchSettings.maxBonusSearches`      | number   | `110`                        | 每次运行的最大额外搜索数（`doBonusSearches` 开启时） | `CONFIG_SEARCH_MAX_BONUS_SEARCHES` |
| `searchSettings.parallelSearching`     | boolean  | `true`                       | 并行执行搜索                                         | `CONFIG_SEARCH_PARALLEL`           |
| `searchSettings.clusterSearch`         | boolean  | `true`                       | 每个主话题与 Bing 建议组成集群                       | `CONFIG_SEARCH_CLUSTER`            |
| `searchSettings.queryEngines`          | string[] | 见 [搜索词来源](#搜索词来源) | 用于构建搜索词池的来源                               | `CONFIG_SEARCH_QUERY_ENGINES` \*   |
| `searchSettings.searchResultVisitTime` | string   | `"10sec"`                    | 每个搜索结果的停留时间                               | `CONFIG_SEARCH_VISIT_TIME`         |
| `searchSettings.searchDelay.min`       | string   | `"30sec"`                    | 搜索之间的最小延迟                                   | `CONFIG_SEARCH_DELAY_MIN`          |
| `searchSettings.searchDelay.max`       | string   | `"1min"`                     | 搜索之间的最大延迟                                   | `CONFIG_SEARCH_DELAY_MAX`          |
| `searchSettings.readDelay.min`         | string   | `"30sec"`                    | 阅读的最小延迟                                       | `CONFIG_SEARCH_READ_DELAY_MIN`     |
| `searchSettings.readDelay.max`         | string   | `"1min"`                     | 阅读的最大延迟                                       | `CONFIG_SEARCH_READ_DELAY_MAX`     |

桌面端和移动端搜索配额独立于仪表盘计数器进行跟踪。所有 `mobileSearch` 条目合并用于移动端配额，所有 `pcSearch` 条目合并用于桌面端执行；明确标识为 Edge 的计数器也会单独显示用于诊断。脚本仅跳过已完成的平台，因此已完成的 `60/60` 移动端配额不会阻止未完成的桌面端配额运行。启用 `parallelSearching` 后，两个未完成的配额可以在各自的浏览器上下文中并发运行。

> [!NOTE]
> \* Docker `CONFIG_*` 数组值为逗号分隔的字符串，例如 `"error,warn"`。正则表达式模式必须直接在 `config.json` 中设置。

#### 搜索词来源

`searchSettings.queryEngines` 控制主搜索话题的来源。可以任意组合选择；所有选定来源的话题会被合并去重。当 `searchSettings.clusterSearch` 启用时，每个主话题会按需通过 Bing 建议扩展，该话题集群会被打乱并完成后，才会进入下一个主话题。

核心来源：

| 选择器       | 来源                                            |
| ------------ | ----------------------------------------------- |
| `google`     | Google Trends（热搜）                           |
| `wikipedia`  | Wikipedia 最热门文章（前一天）                  |
| `wikirandom` | 随机 Wikipedia 文章                             |
| `hackernews` | Hacker News 首页文章                            |
| `reddit`     | Reddit r/popular 帖子标题                       |
| `local`      | 内置的 `src/functions/search-queries.json` 列表 |

RSS 订阅使用点分路径 - `rss` 表示所有订阅，`rss.<站点>` 表示整个站点，`rss.<站点>.<端点>` 表示单个订阅：

| 选择器             | 订阅源                                                          |
| ------------------ | --------------------------------------------------------------- |
| `rss.googleTrends` | Google Trends RSS（`gb`、`us`）                                 |
| `rss.googleNews`   | Google News（`gb`、`us`、`world`、`technology`、`business`）    |
| `rss.bbc`          | BBC News（`top`、`world`、`technology`、`business`、`science`） |
| `rss.guardian`     | The Guardian（`international`、`world`、`technology`）          |
| `rss.theVerge`     | The Verge（`all`）                                              |
| `rss.arsTechnica`  | Ars Technica（`all`）                                           |
| `rss.reddit`       | Reddit 订阅源（`popular`、`worldnews`、`technology`）           |

可在 `src/constants/rssFeeds.ts` 中添加你自己的订阅源。

默认值：

```json
[
    "google",
    "wikipedia",
    "wikirandom",
    "hackernews",
    "reddit",
    "local",
    "rss.googleTrends",
    "rss.googleNews",
    "rss.bbc",
    "rss.guardian.world",
    "rss.theVerge.all"
]
```

> [!NOTE]
> 本 Fork **不包含**中国区搜索词功能。搜索词来源与原版完全一致，使用上述国际源。

### 实验性功能（Experimental）

可选功能，可能会发生变化。默认禁用。

| 设置项                         | 类型    | 默认值  | 说明                                           | Docker 环境变量                          |
| ------------------------------ | ------- | ------- | ---------------------------------------------- | ---------------------------------------- |
| `experimental.apiSearch`       | boolean | `false` | 通过 HTTP 而非驱动浏览器页面执行 Bing 搜索     | `CONFIG_EXPERIMENTAL_API_SEARCH`         |
| `experimental.apiSearchOnBing` | boolean | `false` | 通过 HTTP 而非浏览器完成 ExploreOnBing 活动    | `CONFIG_EXPERIMENTAL_API_SEARCH_ON_BING` |
| `experimental.blockMedia`      | boolean | `false` | 阻止浏览器的 `image` 和 `media` 请求以减少流量 | `CONFIG_EXPERIMENTAL_BLOCK_MEDIA`        |
| `experimental.edgeBrowsing`    | boolean | `false` | 作为后台 HTTP 任务上报 30 分钟 Edge 浏览活动   | `CONFIG_EXPERIMENTAL_EDGE_BROWSING`      |

当 `experimental.blockMedia` 启用时，文档、样式表、脚本、字体、XHR 和 fetch 请求不受影响。这保持了登录和 Rewards 应用流量可用，同时避免了图片、视频和音频下载。该设置也适用于 `npm run open-session`。

当 `experimental.edgeBrowsing` 启用时，该任务在正常活动序列之前启动，并作为独立的 Promise 与每日任务集、推广活动、应用活动和搜索并行运行。如果前台工作先完成，账号会保持开启直到此 Promise 完成。没有该推广、访问令牌或剩余 Edge 工作的账号会被立即跳过。

#### Edge 浏览计时与进度

这是作为计划的报告窗口来跟踪的，而不是盲目地休眠 30 分钟：

1. Edge 配置文件提供 `report_per_minutes`（通常为 `5`）。无效或缺失的值回退为五分钟。
2. 报告次数为 `ceil(30 / 间隔)`。因此五分钟间隔会创建六个报告窗口。
3. 每个窗口的计划时间为服务器间隔加上预生成的随机 5-20 秒偏移。正偏移避免在公布的边界之前提交。
4. 单调时钟跟踪实际运行时间。每次报告和重试后重新计算剩余计划，因此如果请求缓慢或重试，ETA 可能会延后。
5. 每次报告在随机 10-20 秒延迟后有一次重试机会（针对暂时性故障）。认证和其他不可重试的客户端错误会停止活动。
6. `reportsCompleted` 计数已处理的报告窗口。`accepted`、`duplicates` 和 `failed` 分别显示其结果。`scheduledMinutesCovered` 显示这些已处理窗口代表的 30 分钟计划中的时间。

正常的 `INFO` 日志包括下一次报告延迟、已处理和剩余报告数、已覆盖的计划分钟数、已用时间。API 模式在 `/status`、`/points`、`/history` 和 `/accounts` 中以 `accounts[].edgeBrowsing` 暴露相同状态。一个正常的六次报告运行通常需要约 30.5-32 分钟；网络延迟或重试可能会延长。

#### 活动源代码结构

标准活动位于 `src/functions/activities` 下，按职责分组：

- `rewards`：每日任务集、更多推广活动、打卡任务和共享推广调度
- `api`：个别 Rewards API 操作
- `app`：个别移动端应用活动和应用推广编排
- `search`：浏览器搜索流程、搜索跟踪和共享 SearchOnBing 行为
- `visualSearch`：视觉搜索活动及其浏览器传输
- `experimental`：API 搜索、API SearchOnBing、Edge 浏览及其支持传输

实验性活动与其他活动一起位于 `src/functions/activities/experimental` 下。仅浏览器端的媒体阻止器位于 `src/browser/MediaBlocker.ts`。`BrowserFunc` 仅包含共享的 Rewards/浏览器/会话传输，而非个别搜索或视觉搜索实现。

> [!NOTE]
> [Playwright 文档](https://playwright.dev/docs/api/class-browsercontext#browser-context-route)指出，请求路由在激活时会禁用浏览器 HTTP 缓存。启用媒体阻止后，图片密集的页面通常会传输更少的数据，但不保证依赖缓存的网站使用更少的总带宽或加载更快。如果网站依赖图片/媒体加载事件，请保持此选项禁用。

> [!NOTE]
> API 路径更快，但依赖于新版仪表盘的端点。如果 ExploreOnBing 活动未能获得积分，请关闭 `apiSearchOnBing` 以回退到浏览器路径。

无论实验性搜索设置如何，正常的 Rewards 操作都使用引导期间捕获的 cookie 和操作数据，而不刷新可见页面。浏览器保持空闲，直到浏览器支持的搜索开始。失败或未确认的 URL 奖励请求会触发一次上下文刷新和一次重试；成功的请求使用服务器操作返回的余额。

### 日志（Logging）

| 设置项                           | 类型     | 默认值                 | 说明                      | Docker 环境变量                 |
| -------------------------------- | -------- | ---------------------- | ------------------------- | ------------------------------- |
| `debugLogs`                      | boolean  | `false`                | 启用调试日志              | `CONFIG_DEBUG_LOGS`             |
| `consoleLogFilter.enabled`       | boolean  | `false`                | 启用控制台日志过滤        | `CONFIG_LOG_FILTER_ENABLED`     |
| `consoleLogFilter.mode`          | string   | `"whitelist"`          | 过滤模式（白名单/黑名单） | `CONFIG_LOG_FILTER_MODE`        |
| `consoleLogFilter.levels`        | string[] | `["error", "warn"]`    | 要过滤的日志级别          | `CONFIG_LOG_FILTER_LEVELS` \*   |
| `consoleLogFilter.keywords`      | string[] | `["starting account"]` | 要过滤的关键词            | `CONFIG_LOG_FILTER_KEYWORDS` \* |
| `consoleLogFilter.regexPatterns` | string[] | `[]`                   | 用于过滤的正则表达式模式  |                                 |

> [!NOTE]
> \* Docker `CONFIG_*` 数组值为逗号分隔的字符串，例如 `"error,warn"`。正则表达式模式必须直接在 `config.json` 中设置。

### 代理（Proxy）

| 设置项                          | 类型    | 默认值  | 说明                              | Docker 环境变量                          |
| ------------------------------- | ------- | ------- | --------------------------------- | ---------------------------------------- |
| `proxy.queryEngine`             | boolean | `true`  | 代理查询引擎请求                  | `CONFIG_PROXY_QUERY_ENGINE`              |
| `proxy.ignoreCertificateErrors` | boolean | `false` | 为拦截代理禁用浏览器 TLS 证书验证 | `CONFIG_PROXY_IGNORE_CERTIFICATE_ERRORS` |

对于普通的 HTTP(S)/SOCKS 代理，请保持 `proxy.ignoreCertificateErrors` 禁用。启用它会削弱整个浏览器上下文的 TLS 保护，仅应在受信任的拦截代理无法提供有效证书时使用。

`proxy.queryEngine` 控制查询源的 HTTP 请求是否使用账号 HTTP 代理。设置对应的 `ACCOUNT_N_PROXY_HTTP=true`（并配置 `ACCOUNT_N_PROXY_*`）以使这些 HTTP 请求有代理可用；浏览器流量独立使用 `ACCOUNT_N_PROXY_URL`。

账号浏览器代理支持 `http://`、`https://`、`socks4://` 和 `socks5://`（纯主机名视为 HTTP）。HTTP(S) 代理可使用 `ACCOUNT_N_PROXY_USERNAME` 和 `ACCOUNT_N_PROXY_PASSWORD`；Patchright 不支持 SOCKS4/SOCKS5 代理的浏览器认证。无效的协议、端口、不完整的凭据和已认证的 SOCKS 代理配置会在浏览器启动前的账号验证阶段被拒绝。

### Webhook 通知

脚本支持多种 Webhook 通知渠道，可在运行过程中将日志推送到你选择的通知服务。通过 `webhook.webhookLogFilter` 可以控制哪些日志会被推送。

| 设置项                                   | 类型     | 默认值                                               | 说明                      | Docker 环境变量                         |
| ---------------------------------------- | -------- | ---------------------------------------------------- | ------------------------- | --------------------------------------- |
| `webhook.discord.enabled`                | boolean  | `false`                                              | 启用 Discord Webhook      | `CONFIG_DISCORD_ENABLED`                |
| `webhook.discord.url`                    | string   | `""`                                                 | Discord Webhook URL       | `CONFIG_DISCORD_URL`                    |
| `webhook.telegram.enabled`               | boolean  | `false`                                              | 启用 Telegram Webhook     | `CONFIG_TELEGRAM_ENABLED`               |
| `webhook.telegram.botToken`              | string   | `""`                                                 | Telegram Bot Token        | `CONFIG_TELEGRAM_BOTTOKEN`              |
| `webhook.telegram.chatId`                | string   | `""`                                                 | Telegram Chat ID          | `CONFIG_TELEGRAM_CHATID`                |
| `webhook.ntfy.enabled`                   | boolean  | `false`                                              | 启用 ntfy 通知            | `CONFIG_NTFY_ENABLED`                   |
| `webhook.ntfy.url`                       | string   | `""`                                                 | ntfy 服务器 URL           | `CONFIG_NTFY_URL`                       |
| `webhook.ntfy.topic`                     | string   | `""`                                                 | ntfy 话题                 | `CONFIG_NTFY_TOPIC`                     |
| `webhook.ntfy.token`                     | string   | `""`                                                 | ntfy 认证令牌             | `CONFIG_NTFY_TOKEN`                     |
| `webhook.ntfy.title`                     | string   | `"Microsoft-Rewards-Script"`                         | 通知标题                  | `CONFIG_NTFY_TITLE`                     |
| `webhook.ntfy.tags`                      | string[] | `["bot", "notify"]`                                  | 通知标签                  | `CONFIG_NTFY_TAGS` \*                   |
| `webhook.ntfy.priority`                  | number   | `3`                                                  | 通知优先级（1-5）         | `CONFIG_NTFY_PRIORITY`                  |
| `webhook.pushplus.enabled`               | boolean  | `false`                                              | 启用 PushPlus 通知        | `CONFIG_PUSHPLUS_ENABLED`               |
| `webhook.pushplus.token`                 | string   | `""`                                                 | PushPlus Token            | `CONFIG_PUSHPLUS_TOKEN`                 |
| `webhook.pushplus.title`                 | string   | `"Microsoft-Rewards-Script"`                         | 推送标题                  | `CONFIG_PUSHPLUS_TITLE`                 |
| `webhook.pushplus.template`              | string   | `"txt"`                                              | 推送模板                  | `CONFIG_PUSHPLUS_TEMPLATE`              |
| `webhook.pushplus.channel`               | string   | `""`                                                 | 推送渠道                  | `CONFIG_PUSHPLUS_CHANNEL`               |
| `webhook.pushplus.webhook`               | string   | `""`                                                 | Webhook 回调地址          | `CONFIG_PUSHPLUS_WEBHOOK`               |
| `webhook.webhookLogFilter.enabled`       | boolean  | `false`                                              | 启用 Webhook 日志过滤     | `CONFIG_WEBHOOK_LOG_FILTER_ENABLED`     |
| `webhook.webhookLogFilter.mode`          | string   | `"whitelist"`                                        | 过滤模式（白名单/黑名单） | `CONFIG_WEBHOOK_LOG_FILTER_MODE`        |
| `webhook.webhookLogFilter.levels`        | string[] | `["error"]`                                          | 要推送的日志级别          | `CONFIG_WEBHOOK_LOG_FILTER_LEVELS` \*   |
| `webhook.webhookLogFilter.keywords`      | string[] | `["starting account", "select number", "collected"]` | 要过滤的关键词            | `CONFIG_WEBHOOK_LOG_FILTER_KEYWORDS` \* |
| `webhook.webhookLogFilter.regexPatterns` | string[] | `[]`                                                 | 用于过滤的正则表达式模式  |                                         |

> [!NOTE]
> \* Docker `CONFIG_*` 数组值为逗号分隔的字符串，例如 `"error,warn"`。正则表达式模式必须直接在 `config.json` 中设置。

> [!WARNING]
> **NTFY** 用户请将 `webhookLogFilter` 设置为 `enabled`，否则你将收到_所有_日志的推送通知。
> 启用后，仅推送账号启动、2FA 验证码和账号完成摘要。
> 使用 `keywords` 选项自定义接收哪些通知。

#### Discord

[Discord](https://discord.com/) Webhook 是最简单的通知方式之一。

在 `config.json` 中配置：

```json
"webhook": {
    "discord": {
        "enabled": true,
        "url": "https://discord.com/api/webhooks/你的webhook地址"
    }
}
```

或通过 Docker 环境变量：

```yaml
environment:
    CONFIG_DISCORD_ENABLED: 'true'
    CONFIG_DISCORD_URL: 'https://discord.com/api/webhooks/你的webhook地址'
```

#### Telegram

[Telegram](https://telegram.org/) Bot 通知，需要先通过 [@BotFather](https://t.me/BotFather) 创建 Bot 并获取 Chat ID。

在 `config.json` 中配置：

```json
"webhook": {
    "telegram": {
        "enabled": true,
        "botToken": "你的bot_token",
        "chatId": "你的chat_id"
    }
}
```

或通过 Docker 环境变量：

```yaml
environment:
    CONFIG_TELEGRAM_ENABLED: 'true'
    CONFIG_TELEGRAM_BOTTOKEN: '你的bot_token'
    CONFIG_TELEGRAM_CHATID: '你的chat_id'
```

#### ntfy

[ntfy](https://ntfy.sh/) 是一个简单的基于 HTTP 的 pub-sub 通知服务，可以自托管或使用官方服务。

在 `config.json` 中配置：

```json
"webhook": {
    "ntfy": {
        "enabled": true,
        "url": "https://ntfy.sh",
        "topic": "你的topic",
        "token": "",
        "title": "Microsoft-Rewards-Script",
        "tags": ["bot", "notify"],
        "priority": 3
    }
}
```

或通过 Docker 环境变量：

```yaml
environment:
    CONFIG_NTFY_ENABLED: 'true'
    CONFIG_NTFY_URL: 'https://ntfy.sh'
    CONFIG_NTFY_TOPIC: '你的topic'
    CONFIG_NTFY_TITLE: 'Microsoft-Rewards-Script'
    CONFIG_NTFY_PRIORITY: '3'
    CONFIG_NTFY_TAGS: 'bot,notify'
```

#### PushPlus（本 Fork 新增）

[PushPlus](http://www.pushplus.plus/) 是一个国内常用的推送服务，支持通过微信公众号接收通知消息，适合中国用户使用。

**获取 Token：**

1. 访问 [PushPlus 官网](http://www.pushplus.plus/) 注册并登录。
2. 在"一对一推送"或"群组推送"页面获取你的 Token。
3. 关注 PushPlus 微信公众号以接收推送消息。

**在 `config.json` 中配置：**

```json
"pushplus": {
    "enabled": true,
    "token": "你的pushplus_token",
    "title": "Microsoft-Rewards-Script",
    "template": "txt",
    "channel": "",
    "webhook": ""
}
```

配置项说明：

| 配置项     | 类型    | 默认值                       | 说明                                                                               |
| ---------- | ------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| `enabled`  | boolean | `false`                      | 是否启用 PushPlus 推送                                                             |
| `token`    | string  | `""`                         | PushPlus Token（必填，在 PushPlus 官网获取）                                       |
| `title`    | string  | `"Microsoft-Rewards-Script"` | 推送消息标题                                                                       |
| `template` | string  | `"txt"`                      | 消息模板类型（支持 `txt`、`html`、`json`、`markdown` 等）                          |
| `channel`  | string  | `""`                         | 推送渠道（留空默认为微信公众号，可选 `wechat`、`webhook`、`cp`、`sms`、`mail` 等） |
| `webhook`  | string  | `""`                         | Webhook 回调地址（当 channel 为 `webhook` 时使用）                                 |

> [!TIP]
> 推送标题会自动附加日志级别标签，例如 `Microsoft-Rewards-Script [ERROR]`，方便你快速识别消息的重要程度。

**通过 Docker 环境变量配置：**

在 `compose.yaml` 的 `environment:` 部分添加：

```yaml
environment:
    CONFIG_PUSHPLUS_ENABLED: 'true'
    CONFIG_PUSHPLUS_TOKEN: '你的pushplus_token'
    CONFIG_PUSHPLUS_TITLE: 'Microsoft-Rewards-Script'
    CONFIG_PUSHPLUS_TEMPLATE: 'txt'
    # CONFIG_PUSHPLUS_CHANNEL: ''
    # CONFIG_PUSHPLUS_WEBHOOK: ''
```

PushPlus 环境变量一览：

| 环境变量                   | 说明               | 对应配置项          |
| -------------------------- | ------------------ | ------------------- |
| `CONFIG_PUSHPLUS_ENABLED`  | 启用 PushPlus 推送 | `pushplus.enabled`  |
| `CONFIG_PUSHPLUS_TOKEN`    | PushPlus Token     | `pushplus.token`    |
| `CONFIG_PUSHPLUS_TITLE`    | 推送标题           | `pushplus.title`    |
| `CONFIG_PUSHPLUS_TEMPLATE` | 消息模板           | `pushplus.template` |
| `CONFIG_PUSHPLUS_CHANNEL`  | 推送渠道           | `pushplus.channel`  |
| `CONFIG_PUSHPLUS_WEBHOOK`  | Webhook 回调地址   | `pushplus.webhook`  |

> [!NOTE]
> PushPlus 与 Discord、Telegram、ntfy 共享同一套 `webhook.webhookLogFilter` 过滤规则。建议启用 `webhook.webhookLogFilter.enabled` 以避免收到过多日志推送。启用后，仅推送账号启动、2FA 验证码和账号完成摘要等关键日志。

---

## 常见问题

### 登录失败怎么办？

> [!TIP]
> 大多数登录问题可以通过删除 `/sessions` 文件夹并重新部署脚本来解决。

### 容器启动后没有运行？

- 检查 `CRON_SCHEDULE` 是否正确设置（使用 [crontab.guru](https://crontab.guru/) 验证 cron 表达式）。
- 确认 `RUN_ON_START` 设置为 `true` 以在容器启动时立即运行一次。
- 使用 `docker logs microsoft-rewards-script` 查看日志排查问题。

### 配置修改后不生效？

- **本地运行：** 修改 `config.json` 或 `.env` 后需要重新构建：`npm run build`。
- **Docker：** 修改 `CONFIG_*` 环境变量后需要重启容器：`docker compose restart`。`CONFIG_*` 变量在每次启动时都会重新应用。

### PushPlus 收不到推送？

1. 确认 `pushplus.enabled` 设置为 `true`。
2. 确认 `pushplus.token` 正确（在 PushPlus 官网获取）。
3. 确认已关注 PushPlus 微信公众号。
4. 检查 `webhook.webhookLogFilter` 配置 - 如果启用了过滤，可能需要添加相关关键词才能收到推送。
5. 使用 `docker logs microsoft-rewards-script` 查看是否有 PushPlus 相关的错误日志。

### 多账号如何配置？

在 `.env` 文件中添加多个 `ACCOUNT_N_*` 配置块：

```env
ACCOUNT_1_EMAIL=email1@example.com
ACCOUNT_1_PASSWORD=password1

ACCOUNT_2_EMAIL=email2@example.com
ACCOUNT_2_PASSWORD=password2
```

账号编号不需要连续。可通过 `clusters` 配置项设置并发集群数来加速多账号运行。

### 如何使用 2FA（双因素认证）？

设置 `ACCOUNT_N_TOTP_SECRET` 环境变量，填入 TOTP 密钥。脚本会自动生成并输入 6 位验证码。获取密钥的方法见 [账号配置](#账号配置) 部分。

### 会话管理

会话管理工具需要明确的命令参数，不带参数运行时只显示帮助信息，不会删除任何内容。

```bash
# 列出已存储的移动端和桌面端会话
npm run clear-sessions -- list

# 删除某个账号的会话
npm run clear-sessions -- email user@example.com

# 删除所有已存储的会话
npm run clear-sessions -- all
```

通过 Control API 管理会话：

```bash
# 列出安全的会话元数据
curl --request GET \
  --url http://127.0.0.1:3010/sessions \
  --header 'Authorization: Bearer YOUR_API_TOKEN'

# 仅删除 user@example.com 的移动端和桌面端会话
curl --request DELETE \
  --url http://127.0.0.1:3010/sessions/user%40example.com \
  --header 'Authorization: Bearer YOUR_API_TOKEN'
```

详见 [Control API 会话管理文档](scripts/api/README.md#session-management) 了解响应数据、Axios 示例和错误行为。

---

## 致谢与许可

### 致谢

- **原项目** - [TheNetsky/Microsoft-Rewards-Script](https://github.com/TheNetsky/Microsoft-Rewards-Script)：感谢 TheNetsky 及所有贡献者开发的优秀 Microsoft Rewards 自动化脚本。
- [Rewards Dashboard](https://github.com/mgrimace/rewards-dashboard)：受支持的 Web 管理界面。
- [PushPlus](http://www.pushplus.plus/)：推送通知服务。
- 所有开源依赖项目的贡献者。

### 许可证

本项目基于 [GNU General Public License v3.0](LICENSE) 开源许可证发布。

作为 TheNetsky/Microsoft-Rewards-Script 的 Fork 版本，本继承原项目的 GPL-3.0 许可证条款。任何对本 Fork 的使用、修改和分发均须遵守 GPL-3.0 许可证。

---

## 免责声明

使用风险自负。

自动化 Microsoft Rewards 可能导致账号暂停或封禁。

本软件仅供学习和教育目的使用。

作者不对 Microsoft 采取的任何行动负责。
