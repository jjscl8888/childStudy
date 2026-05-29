# 趣学堂 (FunLearn) - Code Wiki

## 1. 项目概览

**趣学堂 (FunLearn)** 是一款面向学龄前及小学低年级儿童的互动式学习应用，采用 Web 技术构建，支持多端访问。项目涵盖拼音、汉字、英语、数学、探索天地等多个学习模块，并集成了语音合成 (TTS)、语音识别 (ASR)、发音评测、汉字笔顺书写、间隔重复记忆等核心功能，旨在通过游戏化学习体验激发儿童学习兴趣。

- **项目名称**: funlearn
- **版本**: 1.0.0
- **语言**: 中文 (zh-CN)
- **应用标题**: 趣学堂 - FunLearn

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.5.13 | Composition API + `<script setup>` |
| 状态管理 | Pinia | ^2.3.0 | 组合式 Store |
| 路由 | Vue Router | ^4.5.0 | History 模式，路由守卫 |
| 构建工具 | Vite | ^6.0.0 | 开发服务器 + 代理 |
| CSS 框架 | Tailwind CSS | ^3.4.16 | 自定义主题色与动画 |
| 语言 | TypeScript | ~5.6.0 | 严格类型检查 |
| 本地数据库 | sql.js (SQLite WASM) | - | 浏览器端 SQLite，数据持久化到 IndexedDB |
| 后端服务 | Express | ^4.18.2 | TTS / 语音评测 API |
| 语音合成 | msedge-tts / @twn39/edgetts-js | - | 微软 Edge TTS 在线语音 |
| 语音评测 | Faster-Whisper (Python) | - | 语音识别 + 发音评分 |
| 汉字书写 | hanzi-writer | ^3.7.3 | 笔顺动画与练习 |
| 图标库 | lucide-vue-next | ^0.468.0 | 轻量 SVG 图标 |

---

## 3. 项目架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                    浏览器 (Client)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Vue 3   │  │  Pinia   │  │   sql.js (WASM)   │  │
│  │  Pages   │──│  Stores  │──│   SQLite in       │  │
│  │Components│  │          │  │   IndexedDB       │  │
│  └────┬─────┘  └──────────┘  └───────────────────┘  │
│       │                                              │
│       │  HTTP (Vite Proxy /api → :3000)              │
│  ┌────▼──────────────────────────────────────────┐   │
│  │          Express Server (port 3000)            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │   │
│  │  │  /api/tts│  │/api/assess│  │ /api/voices │ │   │
│  │  │ Edge TTS │  │ Python   │  │  Voice List │ │   │
│  │  └──────────┘  └──────────┘  └─────────────┘ │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
childStudy/
├── public/                     # 静态资源
│   ├── favicon.svg             # 站点图标
│   └── sql-wasm.wasm           # SQLite WASM 二进制
├── scripts/
│   ├── assess.py               # Python 语音评测脚本
│   └── src/                    # 前端源码
│       ├── assets/
│       │   └── main.css        # 全局样式
│       ├── components/
│       │   ├── common/         # 通用组件
│       │   │   ├── ModuleCard.vue         # 模块卡片
│       │   │   ├── ProgressBar.vue        # 进度条
│       │   │   ├── QuizOption.vue         # 测验选项
│       │   │   ├── RewardAnimation.vue    # 奖励动画
│       │   │   ├── StarDisplay.vue        # 星星展示
│       │   │   ├── TimerPopup.vue         # 计时弹窗
│       │   │   └── VoiceSettingsPanel.vue # 语音设置面板
│       │   ├── layout/         # 布局组件
│       │   │   ├── BottomNav.vue          # 底部导航栏
│       │   │   └── TopBar.vue             # 顶部栏
│       │   └── learning/       # 学习组件
│       │       ├── CharacterMiniGame.vue   # 汉字小游戏
│       │       ├── CompanionGuide.vue      # 伙伴引导
│       │       ├── EnglishMiniGame.vue     # 英语小游戏
│       │       ├── HanziStrokeWriter.vue   # 汉字笔顺书写
│       │       ├── LetterByLetterWriter.vue# 逐字书写
│       │       ├── PinyinMiniGame.vue      # 拼音小游戏
│       │       ├── SessionProgress.vue     # 学习进度
│       │       ├── StrokeDemo.vue          # 笔画演示
│       │       └── WritingPad.vue          # 书写板
│       ├── composables/        # 组合式函数
│       │   ├── useSpeechRecognition.ts     # 语音识别
│       │   └── useTextToSpeech.ts          # 语音合成
│       ├── data/               # 静态数据
│       │   ├── chineseData.ts             # 汉字数据 (213字)
│       │   ├── englishData.ts             # 英语数据 (133词)
│       │   ├── exploreData.ts             # 探索数据 (32主题)
│       │   ├── mathData.ts                # 数学题生成器
│       │   └── pinyinData.ts              # 拼音数据 (63项)
│       ├── db/                 # 数据库层
│       │   ├── database.ts                # SQLite 初始化与操作
│       │   └── migration.ts               # localStorage 迁移
│       ├── pages/              # 页面组件
│       │   ├── admin/          # 管理员
│       │   │   └── AdminLoginPage.vue
│       │   ├── chinese/        # 汉字模块
│       │   │   ├── ChinesePage.vue
│       │   │   └── ChineseDetailPage.vue
│       │   ├── english/        # 英语模块
│       │   │   ├── EnglishPage.vue
│       │   │   └── EnglishDetailPage.vue
│       │   ├── explore/        # 探索模块
│       │   │   └── ExplorePage.vue
│       │   ├── games/          # 游戏模块
│       │   │   ├── GamesPage.vue
│       │   │   ├── MathRacePage.vue
│       │   │   ├── MemoryGamePage.vue
│       │   │   └── QuizGamePage.vue
│       │   ├── math/           # 数学模块
│       │   │   └── MathPage.vue
│       │   ├── parent/         # 家长控制
│       │   │   ├── ParentPage.vue
│       │   │   └── ContentManagePage.vue
│       │   ├── pinyin/         # 拼音模块
│       │   │   ├── PinyinPage.vue
│       │   │   └── PinyinDetailPage.vue
│       │   ├── profile/        # 个人中心
│       │   │   ├── ProfilePage.vue
│       │   │   └── ShopPage.vue
│       │   ├── speech/         # 语音评测
│       │   │   └── SpeechAssessmentPage.vue
│       │   ├── HomePage.vue               # 首页
│       │   └── WelcomePage.vue            # 欢迎页
│       ├── router/
│       │   └── index.ts                   # 路由配置
│       ├── stores/             # Pinia 状态管理
│       │   ├── adminStore.ts              # 管理员状态
│       │   ├── contentStore.ts            # 自定义内容
│       │   ├── learningPathStore.ts       # 学习路径
│       │   ├── spacedRepetitionStore.ts   # 间隔重复
│       │   ├── userStore.ts               # 用户状态
│       │   └── voiceSettingsStore.ts      # 语音设置
│       ├── types/
│       │   └── sql.js.d.ts                # sql.js 类型声明
│       ├── App.vue                         # 根组件
│       ├── env.d.ts                        # 环境类型声明
│       └── main.ts                         # 应用入口
├── server.js                   # Express 后端服务
├── index.html                  # HTML 入口
├── package.json                # 项目配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # Tailwind 配置
├── postcss.config.js           # PostCSS 配置
├── tsconfig.json               # TypeScript 配置
└── tsconfig.node.json          # Node 端 TS 配置
```

---

## 4. 核心模块详解

### 4.1 应用启动流程

**入口文件**: [main.ts](src/main.ts)

```
bootstrap()
  ├── initDatabase()          # 初始化 sql.js → IndexedDB
  ├── migrateFromLocalStorage() # 从旧版 localStorage 迁移数据
  ├── createApp(App)
  ├── app.use(createPinia())  # 挂载 Pinia
  ├── app.use(router)         # 挂载 Vue Router
  └── app.mount('#app')       # 挂载到 DOM
```

应用启动时首先初始化 SQLite 数据库（WASM 版本，数据存储在 IndexedDB 中），然后检查是否需要从旧版 localStorage 迁移数据，最后创建 Vue 应用实例并挂载。

### 4.2 数据库层 (db/)

#### 4.2.1 database.ts - 数据库核心

**核心职责**: 管理 sql.js 实例的生命周期，提供 SQL 操作接口，实现数据持久化。

**数据库架构**: 使用 sql.js (SQLite 编译为 WebAssembly) 在浏览器端运行完整的关系型数据库，数据库文件通过 IndexedDB 持久化存储。

**数据表结构**:

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户信息 | id, name, avatar, stars, level, streak |
| `current_user` | 当前登录用户 | id=1, user_id |
| `learning_records` | 学习记录 | user_id, module, topic, action, score, stars_earned, duration |
| `achievements` | 成就 | user_id, code, name, description, icon, category, unlocked |
| `today_minutes` | 今日学习时长 | user_id, date, minutes |
| `custom_content` | 自定义内容 | module, data (JSON) |
| `review_items` | 间隔重复项 | user_id, module_id, item_id, level, next_review, ease_factor |
| `path_nodes` | 学习路径节点 | user_id, module_id, item_id, order_num, status, stars |
| `parent_settings` | 家长设置 | daily_time_limit, session_time_limit, enabled_modules, password |
| `shop_purchases` | 商店购买 | user_id, item_id |
| `admin_users` | 管理员账户 | username, password_hash |
| `current_admin` | 当前管理员 | id=1, admin_id |
| `voice_settings` | 语音设置 | user_id, rate, pitch, gender, tone, engine, role, edge_tts_* |

**关键函数**:

| 函数 | 签名 | 说明 |
|------|------|------|
| `initDatabase` | `() => Promise<Database>` | 初始化数据库，加载 WASM，从 IndexedDB 恢复数据 |
| `getDatabase` | `() => Database` | 获取当前数据库实例 |
| `persistDatabase` | `() => Promise<void>` | 将数据库导出并保存到 IndexedDB |
| `schedulePersist` | `() => void` | 防抖持久化（300ms 延迟） |
| `run` | `(sql, params?) => void` | 执行写操作 SQL 并触发持久化 |
| `query` | `<T>(sql, params?) => T[]` | 执行查询 SQL 返回结果数组 |
| `queryOne` | `<T>(sql, params?) => T \| null` | 查询单条记录 |

**数据迁移函数**:
- `migrateAddUserId(database)`: 为多用户支持添加 `user_id` 列
- `migrateVoiceSettings(database)`: 迁移语音设置，添加 Edge TTS 相关字段

#### 4.2.2 migration.ts - localStorage 迁移

**核心职责**: 将旧版基于 localStorage 的数据一次性迁移到 SQLite 数据库。

迁移的数据包括：用户列表、当前用户、学习记录、成就、今日时长、自定义内容、间隔重复项、学习路径、家长设置、商店购买记录。迁移完成后通过 `funlearn_migrated_to_sqlite` 标记避免重复迁移。

### 4.3 状态管理层 (stores/)

#### 4.3.1 userStore - 用户状态管理

**Store 名称**: `user`

**核心接口**:

```typescript
interface UserProfile {
  id: string; name: string; avatar: string;
  stars: number; level: number; streak: number; createdAt: string;
}

interface LearningRecord {
  id: string; module: string; topic: string; action: string;
  score: number | null; starsEarned: number; duration: number; createdAt: string;
}

interface Achievement {
  id: string; code: string; name: string; description: string;
  icon: string; category: string; unlocked: boolean; unlockedAt?: string;
}
```

**关键方法**:

| 方法 | 说明 |
|------|------|
| `createUser(name, avatar)` | 创建新用户，初始化成就 |
| `switchUser(userId)` / `selectUser(userId)` | 切换/选择用户 |
| `addStars(count)` | 增加星星，自动升级（50星/级） |
| `addLearningRecord(record)` | 添加学习记录，触发成就检查 |
| `startSession()` / `updateSessionTime()` | 管理学习会话时间 |
| `initAchievements(userId)` | 初始化8个默认成就 |
| `checkAchievements()` | 检查并解锁成就 |
| `unlockAchievement(code)` | 手动解锁成就（奖励5星） |
| `getModuleProgress(module)` | 获取模块学习进度 |
| `logout()` | 退出登录 |

**成就系统**: 预设 8 个成就，涵盖首次学习、拼音/汉字/英语/数学里程碑、连续学习、星星收集、满分测验。

#### 4.3.2 learningPathStore - 学习路径管理

**Store 名称**: `learningPath`

**核心接口**:

```typescript
interface PathNode {
  id: string; moduleId: string; itemId: string; order: number;
  status: 'locked' | 'available' | 'learning' | 'completed';
  stars: number; completedAt?: string;
}

interface LearningSession {
  id: string; moduleId: string; itemId: string;
  startTime: number; currentStep: number; totalSteps: number;
  stepResults: StepResult[]; status: 'active' | 'completed' | 'abandoned';
}
```

**学习路径机制**: 每个学习模块的内容按顺序排列为路径节点，初始只有第一个节点为 `available`，其余为 `locked`。完成当前节点后自动解锁下一个节点。

**关键方法**:

| 方法 | 说明 |
|------|------|
| `initModulePath(moduleId, items)` | 初始化模块学习路径 |
| `getNode(moduleId, itemId)` | 获取路径节点 |
| `getModuleProgress(moduleId)` | 获取模块进度 |
| `completeNode(moduleId, itemId, stars)` | 完成节点，解锁下一节点 |
| `isNodeAccessible(moduleId, itemId)` | 检查节点是否可访问 |
| `startSession(moduleId, itemId, totalSteps)` | 开始学习会话 |
| `completeStep(stepType, score, stars)` | 完成步骤 |
| `finishSession()` | 结束会话，记录学习数据 |
| `abandonSession()` | 放弃会话，恢复节点状态 |
| `setCompanion(message, emotion)` | 设置学习伙伴消息 |

#### 4.3.3 spacedRepetitionStore - 间隔重复

**Store 名称**: `spacedRepetition`

**核心接口**:

```typescript
interface ReviewItem {
  id: string; moduleId: string; itemId: string;
  level: number; nextReview: number; lastReview: number | null;
  reviewCount: number; easeFactor: number; createdAt: number;
}
```

**算法**: 基于 SM-2 变体的间隔重复算法。

- **间隔序列**: `[1, 2, 4, 7, 15, 30]` 天
- **难度因子 (easeFactor)**: 初始 2.5，范围 [1.3, 3.0]
- **质量评级**: `easy` (升级+0.15因子), `good` (保持), `hard` (降级-0.2因子)
- **间隔调整**: `intervalDays * (easeFactor / 2.5)`

**关键方法**:

| 方法 | 说明 |
|------|------|
| `addReviewItem(moduleId, itemId)` | 添加复习项 |
| `processReview(moduleId, itemId, quality)` | 处理复习结果 |
| `isDueForReview(moduleId, itemId)` | 检查是否到期复习 |
| `getModuleReviews(moduleId)` | 获取模块复习项 |
| `todayReviews` (computed) | 今日待复习项 |
| `overdueReviews` (computed) | 逾期复习项 |

#### 4.3.4 contentStore - 自定义内容管理

**Store 名称**: `content`

管理家长/管理员添加的自定义学习内容，支持拼音、汉字、英语、探索四个模块的增删改查。

**关键方法**: `addPinyin`, `addChinese`, `addEnglish`, `addExplore`, `removeItem`, `updateItem`, `getCustomCount`, `getCustomList`

#### 4.3.5 adminStore - 管理员认证

**Store 名称**: `admin`

管理家长控制台的管理员登录状态。使用自定义哈希函数 `simpleHash` 进行密码验证（非加密安全，仅用于本地应用）。

**关键方法**: `login(username, password)`, `logout()`, `changePassword(oldPassword, newPassword)`

#### 4.3.6 voiceSettingsStore - 语音设置

**Store 名称**: `voiceSettings`

管理 TTS 引擎选择和参数配置，支持三种引擎：

| 引擎 | 标识 | 说明 |
|------|------|------|
| 浏览器语音 | `browser` | Web Speech API 原生语音 |
| 在线语音 | `online` | @twn39/edgetts-js 客户端直连 |
| Edge TTS | `edge-tts` | 通过后端 API 调用 msedge-tts |

**语音角色映射** (`ONLINE_ROLE_MAP`):

| 角色 | 语音 | 描述 |
|------|------|------|
| `adult_female` | zh-CN-XiaoxiaoNeural | 标准女声 |
| `adult_male` | zh-CN-YunxiNeural | 标准男声 |
| `gentle_female` | zh-CN-XiaoyiNeural | 温柔女声 |
| `deep_male` | zh-CN-YunjianNeural | 磁性男声 |
| `child_female` | zh-CN-XiaoshuangNeural | 可爱童声 |
| `child_male` | zh-CN-YunxiaNeural | 阳光童声 |

### 4.4 组合式函数 (composables/)

#### 4.4.1 useTextToSpeech - 语音合成

**导出函数**: `useTextToSpeech(defaultLang?, defaultRate?)`

**返回值**: `{ isSpeaking, isLoading, engineError, speak, stop }`

**三种合成模式**:

1. **speakWithBrowser**: 使用 Web Speech API，自动匹配最佳语音（按语言、性别评分），支持失败重试（最多2次）
2. **speakWithOnline**: 使用 `@twn39/edgetts-js` 在客户端直接与 Edge TTS 通信，流式接收音频数据
3. **speakWithEdgeTts**: 通过后端 `/api/tts` 接口调用 `msedge-tts`，返回 MP3 音频

**语音选择算法** (`scoreVoice`): 按语言匹配度（100分）、中文变体（50分）、同语系（30分）、本地服务优先（20分）、性别匹配（10分）综合评分。

**降级策略**: 在线引擎失败时自动降级到浏览器语音。

#### 4.4.2 useSpeechRecognition - 语音识别

**导出函数**: `useSpeechRecognition(options?)`

**选项**: `{ lang, continuous, interimResults, maxDuration }`

**返回值**: `{ isListening, transcript, confidence, error, isSupported, lastAudioUrl, isPlaying, start, stop, playLastRecording, calculateScore }`

**工作流程**:
1. 调用 `start()` 开始录音和识别
2. 同时启动 `MediaRecorder` 录制音频（用于回放和评测）
3. 使用 `SpeechRecognition` API 进行实时识别
4. 识别完成或超时后返回结果

**评分算法** (`calculateScore`):

| 匹配程度 | 分数 | 星星 |
|----------|------|------|
| 完全匹配 | 100 | 3 |
| 包含关系 | 80 | 3 |
| 相似度 ≥ 60% | 70 | 2 |
| 相似度 ≥ 30% | 40 | 1 |
| 相似度 < 30% | 20 | 1 |

### 4.5 数据层 (data/)

#### 4.5.1 pinyinData.ts - 拼音数据

**数据量**: 63 项

**数据结构**:

```typescript
interface PinyinItem {
  id: string; pinyin: string;
  type: 'shengmu' | 'yunmu' | 'zhengti';
  group: string; example: string; examplePinyin: string;
  emoji: string; imageUrl: string;
}
```

**分类**:
- 声母 (shengmu): 23 个，分7组（bpmf, dtnl, gkh, jqx, zhchshr, zcs, yw）
- 韵母 (yunmu): 24 个，分4组（单韵母6个、复韵母9个、前鼻韵母5个、后鼻韵母4个）
- 整体认读 (zhengti): 16 个

#### 4.5.2 chineseData.ts - 汉字数据

**数据量**: 213 个汉字

**数据结构**:

```typescript
interface ChineseCharacter {
  id: string; character: string; pinyin: string;
  group: string; groupName: string;
  words: { word: string; pinyin: string }[];
  sentence: string; originStory: string;
  emoji: string; imageUrl: string;
}
```

**分组**: 数字(10)、自然(8)、人物身体(8)、动物(5)、方位(5)、天地(5)、家庭(5)、学校(4)、生活(6)、植物(4)、常用动词(19)、常用形容词(20)、食物饮品(10)、身体扩展(10)、交通工具(5)、时间(10)、更多动物(9)、学校用品(10)、常用虚词(10)、天气扩展(10)、衣物(10)、建筑场所(10)、动作扩展(10)、称谓(10)

#### 4.5.3 englishData.ts - 英语数据

**数据量**: 133 个单词

**数据结构**:

```typescript
interface EnglishWord {
  id: string; word: string; phonetic: string; chinese: string;
  category: string; categoryName: string;
  exampleSentence: string; emoji: string; imageUrl: string;
}
```

**分类**: fruit(7), animal(15), color(9), number(12), family(9), body(14), school(10), food(9), greeting(7), action(16), clothes(8), nature(10)

#### 4.5.4 mathData.ts - 数学题生成器

**数据结构**:

```typescript
interface MathProblem {
  id: string; type: string; level: number;
  question: string; answer: number; options: number[];
  visualAid: string; hint: string;
}
```

**12个难度等级**:

| 等级 | 名称 | 内容 |
|------|------|------|
| 1 | 数一数 | 认识1-10 |
| 2 | 加法入门 | 5以内加法 |
| 3 | 减法入门 | 5以内减法 |
| 4 | 加法进阶 | 10以内加法 |
| 5 | 减法进阶 | 10以内减法 |
| 6 | 大数挑战 | 20以内加减法 |
| 7 | 比较大小 | >, <, = 符号 |
| 8 | 找规律 | 数字排列规律 |
| 9 | 认识时钟 | 整点和半点 |
| 10 | 认识人民币 | 元角分换算 |
| 11 | 分类归类 | 按特征分类 |
| 12 | 数的组成 | 分解与组成 |

**题目类型**: `addition`, `subtraction`, `counting`, `comparison`, `pattern`, `classification`, `clock`, `money`, `sequence`

**核心函数**: `generateMathProblem(level)` - 根据等级随机生成一道题; `generateMathProblems(level, count)` - 批量生成

#### 4.5.5 exploreData.ts - 探索数据

**数据量**: 32 个主题

**数据结构**:

```typescript
interface ExploreTopic {
  id: string; title: string; category: string; categoryName: string;
  icon: string; content: string; funFact: string;
  imageUrl: string; color: string;
}
```

**分类**: science(自然科学, 6), culture(传统文化, 4), art(艺术启蒙, 1), life(生活常识, 1), readiness(幼小衔接, 5), safety(安全知识, 4), habit(生活习惯, 4), poetry(古诗词, 7)

### 4.6 后端服务 (server.js)

**端口**: 3000

**API 接口**:

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/voices` | 获取 Edge TTS 可用音色列表 |
| POST | `/api/tts` | 文本转语音，返回 MP3 音频流 |
| POST | `/api/assess` | 语音评测（上传音频+期望文本） |
| DELETE | `/api/audio/:filename` | 删除上传的音频文件 |
| GET | `/uploads/:filename` | 静态文件服务（上传的音频） |

**TTS 接口参数**:

```json
{
  "text": "要合成的文本",
  "voice": "zh-CN-XiaoxiaoNeural",
  "rate": "+10%",
  "pitch": "+5Hz",
  "volume": "+0%"
}
```

**语音评测流程**:
1. 前端上传音频文件 (wav) + 期望文本 + 语言
2. 后端保存音频到 `uploads/` 目录
3. 调用 Python 脚本 `scripts/assess.py` 进行评测
4. 返回评测结果（识别文本 + 评分 + 详细信息）

### 4.7 Python 评测脚本 (scripts/assess.py)

**依赖**: `faster-whisper`, `pypinyin` (可选)

**模型**: Faster-Whisper medium (CPU, int8 量化)

**评测模式**:

| 语言 | 函数 | 评测维度 |
|------|------|----------|
| 中文 (zh) | `assess_chinese` | 文本相似度 + 拼音相似度 + 声调检查 |
| 英语 (en) | `assess_english` | 单词级别相似度 |
| 拼音 (pinyin) | `assess_pinyin` | 音节相似度 + 声母正确性 + 声调正确性 |

**中文评测评分公式**: `overall = text_similarity * 0.5 + pinyin_similarity * 0.5`

### 4.8 路由系统 (router/index.ts)

**路由配置**: 使用 `createWebHistory` 模式，所有页面组件均为懒加载。

**主要路由**:

| 路径 | 名称 | 页面 | 说明 |
|------|------|------|------|
| `/` | home | HomePage | 首页（需登录） |
| `/welcome` | welcome | WelcomePage | 欢迎/创建用户 |
| `/admin/login` | admin-login | AdminLoginPage | 管理员登录 |
| `/pinyin` | pinyin | PinyinPage | 拼音列表 |
| `/pinyin/:id` | pinyin-detail | PinyinDetailPage | 拼音详情 |
| `/chinese` | chinese | ChinesePage | 汉字列表 |
| `/chinese/:id` | chinese-detail | ChineseDetailPage | 汉字详情 |
| `/english` | english | EnglishPage | 英语列表 |
| `/english/:id` | english-detail | EnglishDetailPage | 英语详情 |
| `/math` | math | MathPage | 数学练习 |
| `/explore` | explore | ExplorePage | 探索天地 |
| `/games` | games | GamesPage | 游戏中心 |
| `/games/quiz` | games-quiz | QuizGamePage | 测验游戏 |
| `/games/memory` | games-memory | MemoryGamePage | 记忆游戏 |
| `/games/math-race` | games-math-race | MathRacePage | 数学竞赛 |
| `/speech` | speech | SpeechAssessmentPage | 语音评测 |
| `/profile` | profile | ProfilePage | 个人中心 |
| `/profile/shop` | profile-shop | ShopPage | 星星商店 |
| `/parent` | parent | ParentPage | 家长控制（需管理员） |
| `/parent/content` | parent-content | ContentManagePage | 内容管理（需管理员） |

**路由守卫**: `requiresAdmin` meta 标记的页面需要管理员登录，未登录则重定向到 `/admin/login`。

### 4.9 UI 组件体系

#### 4.9.1 布局组件

- **BottomNav**: 底部导航栏，4个 Tab（首页/学习/游戏/我的），使用 lucide-vue-next 图标
- **TopBar**: 顶部栏，显示标题和返回按钮

#### 4.9.2 通用组件

- **ModuleCard**: 学习模块卡片，显示 emoji、标题、描述、进度
- **ProgressBar**: 进度条组件
- **QuizOption**: 测验选项按钮
- **RewardAnimation**: 奖励动画（星星飞出效果）
- **StarDisplay**: 星星数量展示
- **TimerPopup**: 计时弹窗（家长控制用）
- **VoiceSettingsPanel**: 语音设置面板

#### 4.9.3 学习组件

- **HanziStrokeWriter**: 基于 hanzi-writer 的汉字笔顺书写练习
- **StrokeDemo**: 笔画演示
- **WritingPad**: 书写板
- **LetterByLetterWriter**: 逐字书写
- **CharacterMiniGame**: 汉字小游戏
- **PinyinMiniGame**: 拼音小游戏
- **EnglishMiniGame**: 英语小游戏
- **CompanionGuide**: 学习伙伴引导（情绪: happy/encourage/think/celebrate）
- **SessionProgress**: 学习会话进度

---

## 5. 依赖关系

### 5.1 模块依赖图

```
main.ts
  ├── db/database.ts (初始化)
  ├── db/migration.ts (迁移)
  ├── router/index.ts
  │   └── stores/adminStore.ts (路由守卫)
  └── App.vue
      └── components/layout/BottomNav.vue

Pages 依赖关系:
  HomePage → userStore, learningPathStore, spacedRepetitionStore, *Data
  WelcomePage → userStore, learningPathStore, spacedRepetitionStore
  ChineseDetailPage → userStore, learningPathStore, contentStore, useTextToSpeech, useSpeechRecognition
  EnglishDetailPage → userStore, learningPathStore, contentStore, useTextToSpeech, useSpeechRecognition
  PinyinDetailPage → userStore, learningPathStore, contentStore, useTextToSpeech, useSpeechRecognition
  MathPage → userStore, mathData
  SpeechAssessmentPage → useSpeechRecognition, useTextToSpeech
  ParentPage → adminStore, userStore
  ContentManagePage → contentStore, adminStore, *Data
  ProfilePage → userStore, spacedRepetitionStore
  ShopPage → userStore

Store 依赖关系:
  learningPathStore → userStore, db/database
  spacedRepetitionStore → userStore, db/database
  voiceSettingsStore → userStore, db/database
  contentStore → db/database
  adminStore → db/database
  userStore → db/database

Composable 依赖:
  useTextToSpeech → voiceSettingsStore, @twn39/edgetts-js
  useSpeechRecognition → (浏览器 API)
```

### 5.2 外部服务依赖

| 服务 | 用途 | 必要性 |
|------|------|--------|
| Express 后端 (port 3000) | TTS 合成、语音评测 | 可选（浏览器语音可独立工作） |
| Faster-Whisper | 语音评测 | 可选（需 Python 环境） |
| Edge TTS API | 在线语音合成 | 可选（有浏览器语音降级） |
| Google Fonts (Nunito) | 圆角字体 | 可选（有系统字体降级） |
| 图片生成 API | 学习内容配图 | 构建时已内嵌 URL |

---

## 6. 项目运行方式

### 6.1 环境要求

- **Node.js**: >= 18.x
- **Python**: >= 3.8 (语音评测功能，可选)
- **pip**: faster-whisper, pypinyin (语音评测功能，可选)

### 6.2 安装依赖

```bash
npm install
```

### 6.3 开发模式

**仅前端** (不需要 TTS 和语音评测):

```bash
npm run dev
```

前端开发服务器启动在 `http://localhost:5173`，API 请求通过 Vite 代理转发到 `http://localhost:3000`。

**前端 + 后端** (完整功能):

```bash
npm run dev:all
```

同时启动 Express 后端 (port 3000) 和 Vite 前端 (port 5173)。

**仅后端**:

```bash
npm run server
```

### 6.4 构建生产版本

```bash
npm run build
```

执行 `vue-tsc -b` 类型检查 + `vite build` 打包。

### 6.5 类型检查

```bash
npm run check
```

### 6.6 预览生产版本

```bash
npm run preview
```

### 6.7 Vite 开发服务器配置

- **Host**: `0.0.0.0` (允许局域网访问)
- **Port**: 5173
- **API 代理**: `/api` → `http://localhost:3000`, `/uploads` → `http://localhost:3000`
- **WASM 排除**: sql.js 从依赖预构建中排除
- **路径别名**: `@` → `src/`

---

## 7. 设计体系

### 7.1 主题色

| 色名 | 色值 | 用途 |
|------|------|------|
| primary | `#FF9F43` | 主色调（橙色） |
| primary-dark | `#E8892E` | 主色深色 |
| secondary | `#54A0FF` | 辅助色（蓝色） |
| secondary-dark | `#3D8AE8` | 辅助色深色 |
| accent | `#FF6B6B` | 强调色（红色） |
| accent-dark | `#E85555` | 强调色深色 |
| success | `#2ED573` | 成功色（绿色） |
| warning | `#FFA502` | 警告色 |
| warm | `#FFF9E6` | 背景色（暖黄） |
| warm-dark | `#FFF3CC` | 背景色深色 |

### 7.2 字体

- **主字体**: Nunito (Google Fonts)
- **中文降级**: PingFang SC, Microsoft YaHei, sans-serif

### 7.3 自定义动画

| 动画名 | 效果 | 用途 |
|--------|------|------|
| bounce-slow | 慢速弹跳 | 引导提示 |
| float | 上下浮动 | 装饰元素 |
| wiggle | 左右摇摆 | 互动反馈 |
| pop | 缩放弹出 | 出现动画 |
| star-fly | 星星飞出 | 奖励效果 |
| slide-up | 上滑进入 | 页面切换 |
| fade-in | 淡入 | 通用过渡 |

---

## 8. 关键业务流程

### 8.1 用户注册与登录流程

```
WelcomePage
  ├── 无用户 → 显示创建用户表单
  │   ├── 输入名字 + 选择头像
  │   ├── userStore.createUser() → 创建用户记录
  │   ├── initAchievements() → 初始化8个成就
  │   └── 跳转首页
  └── 有用户 → 显示用户列表
      ├── 点击用户 → selectUser() → 跳转首页
      └── 创建新用户 → 同上
```

### 8.2 学习会话流程

```
进入模块详情页
  ├── learningPathStore.initModulePath() → 初始化路径节点
  ├── isNodeAccessible() → 检查是否可学习
  ├── startSession(moduleId, itemId, totalSteps) → 开始会话
  │   ├── 节点状态: available → learning
  │   └── 创建 LearningSession
  ├── 学习步骤循环:
  │   ├── 展示内容 (TTS 朗读)
  │   ├── 互动练习 (书写/语音/选择)
  │   └── completeStep(stepType, score, stars)
  ├── finishSession() → 结束会话
  │   ├── completeNode() → 节点状态: learning → completed
  │   ├── 解锁下一节点
  │   ├── userStore.addLearningRecord() → 记录学习数据
  │   ├── addStars() → 增加星星
  │   └── checkAchievements() → 检查成就
  └── abandonSession() → 放弃会话
      └── 节点状态: learning → available
```

### 8.3 语音评测流程

```
SpeechAssessmentPage
  ├── useSpeechRecognition.start() → 开始录音
  │   ├── MediaRecorder 录制音频
  │   └── SpeechRecognition 实时识别
  ├── 识别完成 → calculateScore() → 本地评分
  ├── 可选: 发送到后端详细评测
  │   ├── POST /api/assess (audio + expectedText)
  │   ├── server.js → 调用 assess.py
  │   │   ├── Faster-Whisper 语音识别
  │   │   ├── 中文: assess_chinese() → 文本+拼音+声调评分
  │   │   ├── 英语: assess_english() → 单词级评分
  │   │   └── 拼音: assess_pinyin() → 音节+声母+声调评分
  │   └── 返回详细评测结果
  └── 展示评分和详细反馈
```

### 8.4 间隔重复复习流程

```
学习完成
  ├── spacedRepetitionStore.addReviewItem(moduleId, itemId)
  │   └── 初始间隔: 1天后复习
  ├── 每日检查: todayReviews / overdueReviews
  ├── 到期复习:
  │   ├── processReview(moduleId, itemId, quality)
  │   │   ├── easy → level+1, easeFactor+0.15
  │   │   ├── good → level不变
  │   │   └── hard → level-1, easeFactor-0.2
  │   └── 计算下次复习时间: interval * (easeFactor / 2.5)
  └── 间隔序列: 1→2→4→7→15→30 天
```

---

## 9. 数据流总结

```
用户操作
  │
  ├── Vue 组件 (Pages/Components)
  │     │
  │     ├── Pinia Store (状态管理)
  │     │     │
  │     │     ├── db/database.ts (SQL 操作)
  │     │     │     │
  │     │     │     └── sql.js (WASM SQLite)
  │     │     │           │
  │     │     │           └── IndexedDB (持久化)
  │     │     │
  │     │     └── 其他 Store (跨模块通信)
  │     │
  │     ├── Composables (可复用逻辑)
  │     │     ├── useTextToSpeech → 浏览器 API / 后端 API
  │     │     └── useSpeechRecognition → 浏览器 API
  │     │
  │     └── Data (静态数据)
  │           ├── pinyinData / chineseData / englishData
  │           ├── mathData (动态生成)
  │           └── exploreData
  │
  └── Express 后端 (server.js)
        ├── /api/tts → msedge-tts
        ├── /api/voices → Edge TTS 音色列表
        └── /api/assess → Python assess.py → Faster-Whisper
```
