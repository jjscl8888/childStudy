# 趣学堂 (FunLearn)

儿童趣味学习平台，包含汉字、数学、英语等学习模块。

## 环境要求

- Node.js >= 18
- npm >= 9

## 安装依赖

```bash
npm install
```

## 环境变量配置

项目根目录创建 `.env` 文件，参考 `.env.example`：

```env
# 前端 API 地址（开发环境留空使用代理）
VITE_API_BASE_URL=

# 后端服务端口
PORT=3000

# 跨域允许地址
CORS_ORIGINS=http://localhost:5173

# 数据库配置（PostgreSQL，可选）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=funlearn
DB_USER=postgres
DB_PASSWORD=postgres

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 邮件服务器配置（用于发送验证码）
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your_email@qq.com
EMAIL_PASS=your_smtp_auth_code
```

### 邮件服务器配置说明

**QQ邮箱：**
1. 登录 QQ 邮箱网页版
2. 设置 → 账户 → 开启 SMTP 服务
3. 获取 16 位授权码（不是邮箱登录密码）

**163邮箱：**
1. 登录 163 邮箱网页版
2. 设置 → POP3/SMTP/IMAP → 开启 SMTP 服务
3. 获取授权码

## 启动方式

### 开发环境（推荐）

同时启动前端和后端：

```bash
npm run dev:all
```

- 前端地址：http://localhost:5173
- 后端地址：http://localhost:3000

### 单独启动

只启动前端：

```bash
npm run dev
```

只启动后端：

```bash
npm run server
```

### 生产环境

```bash
npm run build
npm run server
```

## 更新 .env 后重启

修改 `.env` 文件后，需要**完全重启**服务才能生效：

1. 按 `Ctrl + C` 停止当前运行的服务
2. 重新执行启动命令：

```bash
npm run dev:all
```

> 注意：`.env` 文件的修改不会自动热更新，必须重启服务。

## 项目结构

```
├── src/                    # 前端源码
│   ├── pages/             # 页面组件
│   ├── components/        # 公共组件
│   ├── stores/            # Pinia 状态管理
│   └── composables/       # 组合式函数
├── server/                # 后端源码
│   ├── routes/            # API 路由
│   ├── middleware/        # 中间件
│   └── utils/             # 工具函数
├── server.js              # 后端入口文件
└── package.json           # 项目配置
```

## 技术栈

- 前端：Vue 3 + TypeScript + Tailwind CSS + Pinia
- 后端：Express + SQLite/PostgreSQL
- 语音：Microsoft Edge TTS
- 邮件：Nodemailer
