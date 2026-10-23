# 安智伴 · 家人连线台（Web 监护端）

> 本项目与 [dh_aigc_android](https://github.com/user/dh_aigc_android)（Android AI 数字人陪护终端）配合使用，共同构成完整的"AI 数字人 + 家庭远程关怀"解决方案。

---

## 目录

- [需求分析](#需求分析)
- [设计思路](#设计思路)
- [技术架构](#技术架构)
- [数据库设计](#数据库设计)
- [页面与功能](#页面与功能)
- [API 接口](#api-接口)
- [全链路数据流](#全链路数据流)
- [推送通知系统](#推送通知系统)
- [身份验证](#身份验证)
- [开发与部署](#开发与部署)

---

## 需求分析

### 背景

配合 Android 端 AI 数字人陪护应用，家属需要一个便捷的远程监护面板来：
- 了解老人是否在使用设备、与 AI 聊了什么
- 主动发送关怀留言，由数字人口播转达
- 接收老人通过 AI 口述的回复留言
- 获得实时推送通知，不遗漏重要消息

### 核心需求

| 需求维度 | 描述 |
|---------|------|
| **双向留言** | 家属发送留言 → 数字人口播给老人；老人口述 → AI 转录 → 家属在此查看 |
| **使用监测** | 查看老人设备的使用频率、AI 对话次数、最后在线时间 |
| **设备绑定** | 支持扫码或手动输入设备码绑定老人设备，一个家属可绑定多台设备 |
| **推送提醒** | 收到新留言时浏览器推送通知（PWA + Web Push） |
| **多端登录** | 同一家属账号可在多个浏览器/设备登录 |
| **面向家属的友好界面** | 暖色调、生活化文案，避免技术化的配置面板 |

### 用户角色

| 角色 | 使用场景 |
|------|---------|
| **家属**（本 Web 端） | 登录后查看老人动态、发送留言、管理设备绑定、接收推送 |
| **老人**（Android 端） | 不直接使用本系统，通过 AI 数字人间接交互 |
| **设备**（Android 端自动上报） | 自动注册、上报使用事件和对话数据 |

---

## 设计思路

### 1. 以留言为核心的关怀模式

不同于即时通讯工具，本系统采用"留言板"模式：
- 家属写留言 → 等老人下次与 AI 对话时口播转达
- 老人对 AI 说"帮我给儿子捎个话" → AI 通过工具调用存入数据库 → 家属收到推送

这种异步模式契合老人的使用习惯，无需老人学习操作手机。

### 2. 设备即桥梁

- Android 设备是唯一的数据桥梁，通过 UUID 标识
- 家属通过扫码或输入设备码绑定设备
- 所有消息和事件都关联到设备维度

### 3. PWA 优先

- 支持"安装到桌面"，像原生 App 一样使用
- Service Worker 处理推送通知
- 即使浏览器关闭也能收到消息提醒

### 4. 温暖的视觉语言

- 暖色系纸质质感（`--paper: #f4ece0`、`--copper: #c76733`、`--olive: #76845e`）
- 生活化文案（"写好并送出"而非"提交"）
- 面向不一定技术精通的家属用户

---

## 技术架构

### 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router, Server Components) |
| **前端** | React 19 + TypeScript 5 |
| **样式** | Tailwind CSS 4 + CSS 变量暖色系统 |
| **ORM** | Prisma 7 + PrismaPg 适配器 |
| **数据库** | PostgreSQL |
| **推送** | Web Push API + VAPID 密钥 |
| **认证** | Session-based (HttpOnly Cookie + bcryptjs) |
| **PWA** | Service Worker + Web App Manifest |
| **扫码** | qr-scanner (浏览器端摄像头扫码) |

### 系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                    家属浏览器 (PWA)                                │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ 设备管理         │  │ 留言板       │  │ 陪伴动态           │  │
│  │ (扫码绑定/列表)  │  │ (双向消息)   │  │ (使用/对话/工具)   │  │
│  └────────┬────────┘  └──────┬──────┘  └─────────┬──────────┘  │
│           │                  │                    │              │
│  ┌────────▼──────────────────▼────────────────────▼──────────┐  │
│  │              Service Worker (Web Push)                     │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js Server                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    API Routes                              │  │
│  │  /api/account/*    认证 (登录/注册/登出)                    │  │
│  │  /api/family/*     家属操作 (发留言/绑定/别名/解绑)         │  │
│  │  /api/device/*     设备上报 (注册/消息/事件/对话/工具)      │  │
│  │  /api/push/*       推送管理 (订阅/退订/测试)               │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │                    Prisma ORM                              │  │
│  └────────────────────────────┬───────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     PostgreSQL        │
                    │                       │
                    │  CaregiverAccount     │
                    │  CaregiverSession     │
                    │  ElderDevice          │
                    │  DeviceBinding        │
                    │  FamilyMessage        │
                    │  ConversationTurn     │
                    │  UsageEvent           │
                    │  ToolCallLog          │
                    │  PushSubscription     │
                    └───────────────────────┘
```

### 与 Android 端的通信

```
┌──────────────────┐         ┌──────────────────┐
│  Android 设备端   │         │  Next.js 云端     │
│                  │         │                  │
│ FamilyBridge     │ ──────→ │ /api/device/*    │
│ Service          │  HTTPS  │                  │
│                  │         │  • register      │
│ • 设备注册        │ ──────→ │  • messages      │
│ • 拉取留言        │ ←────── │  • messages/read │
│ • 标记已读        │ ──────→ │  • usage         │
│ • 上报事件        │ ──────→ │  • conversations │
│ • 上传对话        │ ──────→ │  • tool-call     │
│ • 工具调用记录    │ ──────→ │                  │
└──────────────────┘         └──────────────────┘
```

---

## 数据库设计

### ER 关系

```
CaregiverAccount ──1:N──→ CaregiverSession     (多设备登录)
CaregiverAccount ──1:N──→ DeviceBinding         (绑定多台设备)
CaregiverAccount ──1:N──→ FamilyMessage         (发出的留言)
CaregiverAccount ──1:N──→ PushSubscription      (推送端点)

ElderDevice ──1:N──→ DeviceBinding              (被多个家属绑定)
ElderDevice ──1:N──→ FamilyMessage              (关联的留言)
ElderDevice ──1:N──→ ConversationTurn           (对话记录)
ElderDevice ──1:N──→ UsageEvent                 (使用事件)
ElderDevice ──1:N──→ ToolCallLog                (工具调用日志)
```

### 核心数据模型

#### CaregiverAccount（家属账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 自增主键 |
| username | String (unique) | 账户名，3-24 位 |
| passwordHash | String | bcrypt 密码哈希 |
| nickname | String? | 昵称 |

#### ElderDevice（老人设备）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 自增主键 |
| deviceUuid | String (unique) | UUID 格式设备号 |
| displayName | String? | 设备显示名 |
| appVersion | String? | 应用版本号 |
| lastSeenAt | DateTime | 最后在线时间 |

#### DeviceBinding（设备绑定）

| 字段 | 类型 | 说明 |
|------|------|------|
| caregiverId + elderDeviceId | 复合唯一键 | 多对多桥接 |
| alias | String? | 自定义别名（≤24 字） |

#### FamilyMessage（双向留言）

| 字段 | 类型 | 说明 |
|------|------|------|
| publicId | Int (auto-increment) | 公开 ID，用于 URL |
| content | String | 留言内容 |
| direction | Enum | `ELDER_TO_FAMILY` / `FAMILY_TO_ELDER` |
| importance | Enum | `LOW` / `NORMAL` / `HIGH` / `URGENT` |
| status | Enum | `PENDING` / `DELIVERED` / `READ` |

#### UsageEvent（使用事件）

事件类型：`APP_OPEN` · `SETTINGS_OPENED` · `AI_SESSION_STARTED` · `AI_SESSION_ENDED` · `CAMERA_ENABLED` · `CAMERA_DISABLED` · `TOOL_CALLED`

#### ConversationTurn（对话轮次）

角色：`USER`（老人语音）· `ASSISTANT`（AI 回复）· `TOOL`（工具调用）

#### ToolCallLog（工具调用日志）

记录 AI 对话中触发的工具调用，包括工具名、参数 JSON、执行结果、状态。

### 迁移历史

| 版本 | 时间 | 内容 |
|------|------|------|
| v1 | 2026-04-17 01:50 | 初始表结构 + 枚举类型 |
| v2 | 2026-04-17 04:09 | 添加 publicId + PushSubscription 表 |
| v3 | 2026-04-17 04:51 | 账号认证系统 + 多设备会话 |
| v4 | 2026-04-17 07:00 | 设备绑定别名功能 |

---

## 页面与功能

### 页面结构

```
/login              → 登录 / 注册
/                   → 首页概览 (KPI 卡片 + 导航)
/devices            → 设备列表 (绑定新设备 + 快速统计)
/devices/[uuid]     → 设备详情 (发送留言 + 收到留言 + 活动记录)
/messages           → 留言板 (双列：老人留言 / 我的问候)
/messages/[id]      → 留言详情
/activity           → 陪伴动态 (使用记录 + 聊天记录 + 智能服务)
/scan               → 扫码绑定 (QR Scanner)
/settings           → 设置 (PWA 安装 + 推送管理)
/bind               → 绑定结果页
```

### 首页 `/`

- 4 个 KPI 卡片：已绑设备数、新留言数、待查看数、对话总数
- 4 个功能导航卡片：留言板、设备管理、陪伴动态、设置
- 无设备时显示引导流程
- 最近消息预览

### 设备管理 `/devices`

- 手动粘贴设备码绑定
- 设备卡片：在线状态、留言数、对话数、智能服务调用数
- 最新动态预览

### 设备详情 `/devices/[uuid]`

- KPI 指标（新留言、待查看、最后在线、绑定链接）
- 设备管理（别名修改、解绑）
- 发送留言表单（4 个优先级）
- 最近收到的留言列表
- 最近活动记录
- 已发送的问候
- 最近对话片段

### 留言板 `/messages`

- 双列分组：左侧"长辈的留言"（含未读计数）、右侧"我发出的问候"（含待查看计数）
- 每条显示：公开 ID、方向标签、设备名、优先级、状态、时间戳

### 陪伴动态 `/activity`

- 三列展示：使用记录、聊天记录、智能服务
- 趋势可视化图表

### 扫码绑定 `/scan`

- 浏览器摄像头 QR 扫描
- 自动摄像头授权检测
- 失败降级提示手动输入

---

## API 接口

### 账号管理 `/api/account/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/login` | POST | 登录（username + password → 设置 Session Cookie） |
| `/register` | POST | 注册（创建账号 + 自动登录） |
| `/logout` | POST | 登出（清除 Cookie + 删除 Session） |

### 家属操作 `/api/family/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/messages` | POST | 发送留言给老人（创建 FamilyMessage + 触发 Web Push） |
| `/device-binding` | PATCH | 修改设备别名 |
| `/device-binding` | DELETE | 解绑设备 |
| `/bind` | POST | 绑定新设备 |
| `/session` | GET | 会话验证 + 重定向 |

### 设备上报 `/api/device/`

| 路由 | 方法 | 功能 | 认证方式 |
|------|------|------|---------|
| `/register` | POST | 设备注册/更新 | deviceUuid 验证 |
| `/messages` | GET | 拉取待发送消息 | deviceUuid 查询参数 |
| `/messages/read` | POST | 标记消息已读 | deviceUuid 验证 |
| `/conversations` | POST | 记录对话内容 | deviceUuid 验证 |
| `/usage` | POST | 上报使用事件 | deviceUuid 验证 |
| `/tool-call` | POST | 记录工具调用 | deviceUuid 验证 |

### 推送管理 `/api/push/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/subscribe` | POST | 订阅推送通知（需登录） |
| `/unsubscribe` | POST | 取消订阅 |
| `/test` | POST | 发送测试推送 |

---

## 全链路数据流

### 1. 设备绑定流程

```
老人设备首次启动 → POST /api/device/register → 获得 deviceUuid + bindUrl
→ 设备屏幕展示二维码（编码 bindUrl）
→ 家属打开 /scan 页面 → 浏览器摄像头扫码
→ 解析出 /bind?deviceUuid=xxx
→ 未登录 → 重定向 /login?redirectTo=/bind?deviceUuid=xxx
→ 已登录 → 调用 POST /api/family/bind
→ 检查/创建 ElderDevice → 创建 DeviceBinding → 迁移遗留数据
→ 绑定成功页
```

### 2. 家属发送留言 → 老人收到

```
家属在 /devices/[uuid] 填写留言 → POST /api/family/messages
→ 创建 FamilyMessage (FAMILY_TO_ELDER, PENDING)
→ 触发 sendIncomingMessagePush() → 向所有订阅端点发送 Web Push
→ 家属收到浏览器通知确认

→ (稍后) 老人设备启动 AI 对话
→ FamilyBridgeService → GET /api/device/messages
→ 返回未读消息 (summaryText + messages[])
→ 注入 AI 系统 Prompt → AI 在第一轮回复中主动口播转达
→ 设备端 → POST /api/device/messages/read → 标记已读
```

### 3. 老人口述留言 → 家属收到

```
老人对 AI 说 "帮我给女儿说一声我今天去公园了"
→ Qwen 识别意图 → 触发 leave_message_for_family 工具
→ FamilyBridgeService → POST /api/device/conversations
→ 创建 FamilyMessage (ELDER_TO_FAMILY)
→ 触发 Web Push → 家属浏览器通知
→ 家属打开 /messages 查看
```

### 4. 使用监测

```
设备事件 (APP_OPEN / AI_SESSION_STARTED / ...)
→ POST /api/device/usage → 存入 UsageEvent
→ 家属访问 /activity → Server Component 查询最近事件
→ 渲染使用趋势图 + 对话记录 + 工具调用日志
```

---

## 推送通知系统

### 架构

```
家属浏览器
├── 注册 Service Worker (/sw.js)
├── PushManager.subscribe(VAPID 公钥) → 获取 PushSubscription
├── POST /api/push/subscribe → 存入数据库
└── 收到推送 → showNotification() → 点击 → 打开对应页面

服务端 (新消息触发时)
├── 查询目标设备所有已绑定家属的 PushSubscription
├── 循环调用 webpush.sendNotification()
└── 处理 410 Gone → 清理失效端点
```

### Service Worker 功能

- **push 事件**：解析 JSON → 调用 `showNotification()`，显示标题、内容、图标
- **notificationclick 事件**：打开或聚焦到目标 URL，支持已打开窗口的导航
- **去重**：使用 `tag: "digital-human-message"` 合并同类通知

---

## 身份验证

### 家属端（Session-based）

| 项目 | 说明 |
|------|------|
| Cookie 名 | `dh-caregiver-session` |
| 属性 | HttpOnly + Secure (生产) + SameSite=Lax |
| 有效期 | 365 天 |
| 密码哈希 | bcryptjs |
| 多设备 | 每次登录创建独立 Session，支持多端在线 |

### 设备端（UUID 隐式验证）

设备通过 `deviceUuid` 参数标识身份，依赖 UUID 的不可猜测性。无需额外认证令牌。

---

## 开发与部署

### 环境变量

```env
DATABASE_URL=postgresql://...              # PostgreSQL 连接串
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...           # Web Push 公钥（客户端）
VAPID_PRIVATE_KEY=...                      # Web Push 私钥（服务端）
VAPID_SUBJECT=mailto:admin@example.com     # 推送发送者标识
```

### 本地开发

```bash
# 安装依赖
npm install

# 数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 。

### 数据库管理

```bash
# 查看数据库
npx prisma studio

# 生成 Prisma Client
npx prisma generate

# 创建新迁移
npx prisma migrate dev --name <migration-name>
```

### 生产部署

```bash
# 构建
npm run build

# 启动
npm start
```

支持部署到 Vercel、Docker 或任何 Node.js 环境。

### 项目结构

```
digital-human-monitor-v2/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # 根布局 (认证状态 + 导航)
│   ├── page.tsx             # 首页概览
│   ├── globals.css          # 全局样式 (暖色系变量)
│   ├── manifest.ts          # PWA Manifest
│   ├── api/                 # API 路由
│   │   ├── account/         # 登录/注册/登出
│   │   ├── device/          # 设备上报接口
│   │   ├── family/          # 家属操作接口
│   │   └── push/            # 推送管理
│   ├── activity/            # 陪伴动态页
│   ├── bind/                # 绑定结果页
│   ├── devices/             # 设备管理
│   │   └── [deviceUuid]/    # 设备详情
│   ├── login/               # 登录/注册页
│   ├── messages/            # 留言板
│   │   └── [messageId]/     # 留言详情
│   ├── scan/                # 扫码绑定
│   └── settings/            # 设置页
├── components/              # 可复用 UI 组件
├── lib/                     # 业务逻辑库
│   ├── prisma.ts            # Prisma 客户端单例
│   ├── session.ts           # Session 管理
│   ├── page-auth.ts         # 页面级认证守卫
│   ├── push.ts              # Web Push 发送逻辑
│   ├── caregiver-panel.ts   # 家属面板数据聚合
│   ├── monitor-data.ts      # 监测数据查询
│   └── panel-format.ts      # 面板格式化工具
├── prisma/
│   ├── schema.prisma        # 数据库 Schema
│   └── migrations/          # 迁移文件
├── public/
│   ├── sw.js                # Service Worker
│   └── pwa/                 # PWA 图标资源
└── scripts/
    └── generate-icons.mjs   # 图标生成脚本
```

---

## 关联项目

| 项目 | 角色 | 仓库 |
|------|------|------|
| **digital-human-monitor-v2**（本项目） | 家属端：远程监护 Web 面板 + 消息管理 + 推送通知 | 当前仓库 |
| **dh_aigc_android** | 老人端：AI 数字人陪护 + 设备行为上报 | [dh_aigc_android](../dh_aigc_android/) |
