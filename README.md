# 9Router

[English](./README.md) | 中文

## 简介

9Router 是一个本地 AI 路由网关，可作为 CLI 工具（Claude Code、Codex、Cursor 等）与多个 AI 提供商之间的智能中间件，提供自动Fallback、格式转换和用量追踪功能。

## 特性

- **智能 Fallback**：自动在订阅版 → 廉价版 → 免费版之间切换
- **多账户支持**：每个提供商支持多个账户，自动轮询和故障转移
- **格式转换**：支持 OpenAI、Claude、Gemini 之间的格式自动转换
- **用量追踪**：实时显示 Token 消耗和重置倒计时
- **自动 Token 刷新**：OAuth Token 自动刷新，无需手动重新登录
- **自定义组合**：创建任意模型组合，灵活配置Fallback 策略
- **云端同步**：跨设备同步配置

## 快速开始

### 本地构建

```bash
git clone https://github.com/lim12137/9router.git
cd 9router
cp .env.example .env
npm install
npm run dev
```

服务启动后访问 `http://localhost:20128`

### Docker 部署

```bash
docker build -t 9router .

docker run -d \
  --name 9router \
  -p 20128:20128 \
  --env-file .env \
  -v 9router-data:/app/data \
  -v 9router-usage:/root/.9router \
  9router
```

> 注：本仓库仅提供本地构建和 Docker 部署，不发布 npm 包

## 可用模型

| 提供商 | 标识 | 模型示例 | 费用 |
|--------|------|----------|------|
| Claude Code | `cc/` | `cc/claude-opus-4-6` | $20/月 |
| Codex | `cx/` | `cx/gpt-5.2-codex` | $20-200/月 |
| Gemini CLI | `gc/` | `gc/gemini-3-flash` | 免费 180K/月 |
| iFlow | `if/` | `if/kimi-k2-thinking` | 免费 |
| Qwen | `qw/` | `qw/qwen3-coder-plus` | 免费 |
| Kiro | `kr/` | `kr/claude-sonnet-4.5` | 免费 |
| GLM | `glm/` | `glm/glm-4.7` | ¥4/1M |
| MiniMax | `minimax/` | `minimax/MiniMax-M2.1` | ¥1.5/1M |

## 创建组合

```
仪表盘 → Combos → Create New

Name: my-combo
Models:
  1. cc/claude-opus-4-6
  2. glm/glm-4.7
  3. if/kimi-k2-thinking
```

使用组合：`my-combo` 作为模型名称

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `JWT_SECRET` | - | JWT 签名密钥（生产环境必须修改） |
| `INITIAL_PASSWORD` | `123456` | 首次登录密码 |
| `DATA_DIR` | `~/.9router` | 数据库存储路径 |
| `PORT` | `20128` | 服务端口 |
| `REQUIRE_API_KEY` | `false` | 是否强制要求 API Key |
| `HTTP_PROXY` | - | 上游请求代理 |

## 连接提供商

在仪表盘（Dashboard）中：`Providers` → `Connect` → 完成 OAuth 登录

## 使用方式

在 CLI 工具中配置：

```
Endpoint: http://localhost:20128/v1
API Key: [从仪表盘获取]
Model: if/kimi-k2-thinking
```

## 文档

- [完整文档](./docs/README.md)
- [架构说明](./docs/ARCHITECTURE.md)
- [贡献指南](./CONTRIBUTING.md)

## 问题排查

**配额耗尽**
- 使用组合 Fallback：`cc/claude-opus-4-6 → glm/glm-4.7 → if/kimi-k2-thinking`

**OAuth Token 过期**
- 仪表盘 → Provider → 重新连接

**云同步失败**
- 在仪表盘创建新 Key 并重新同步

## 相关链接

- 官网：[9router.com](https://9router.com)
- GitHub：[github.com/decolua/9router](https://github.com/decolua/9router)

## 许可证

[MIT](./LICENSE)
