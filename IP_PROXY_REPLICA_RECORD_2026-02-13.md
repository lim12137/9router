# IP Proxy 功能复刻记录（2026-02-13）

## 1. 目标
- 参考 `M:\Agent\sub2api` 的代理能力，在 `M:\Agent\9router` 复刻以下核心能力：
- 支持多条代理配置（而非单条全局代理）。
- 在界面中可直接看到每条代理地址。
- 每个提供商（provider）可单独绑定代理。

## 2. 本次已完成内容

### 2.1 数据模型与持久化
- 扩展 `settings` 结构，新增：
- `proxyProfiles: []`（多条代理配置）
- `providerProxyBindings: {}`（provider -> proxyProfileId 映射）

涉及文件：
- `src/lib/localDb.js`
- `src/app/api/settings/route.js`
- `src/lib/proxy/settings.js`

### 2.2 运行时按 Provider 使用代理
- 新增请求级代理上下文，避免并发请求下修改进程级环境变量导致串线。
- 使用 `AsyncLocalStorage` 保存当前请求的代理配置。
- 对 `fetch` 做运行时补丁，在上下文存在时注入代理 dispatcher。

涉及文件：
- `src/lib/proxy/context.js`
- `src/lib/proxy/fetchPatch.js`

### 2.3 主链路接入
- 聊天主请求链路已接入 provider 级代理（包含 token refresh 与上游调用）。

涉及文件：
- `src/sse/handlers/chat.js`

### 2.4 Provider 相关接口接入
- 以下接口已按 provider 绑定代理执行：
- 连接测试：`/api/providers/[id]/test`
- 模型拉取：`/api/providers/[id]/models`
- API Key 校验：`/api/providers/validate`

涉及文件：
- `src/app/api/providers/[id]/test/route.js`
- `src/app/api/providers/[id]/models/route.js`
- `src/app/api/providers/validate/route.js`

### 2.5 设置页 UI（多条代理 + 地址显示 + 提供商绑定）
- 保留原有“全局兜底代理”区域（向后兼容）。
- 新增“多条代理配置”列表：
- 支持增删代理条目
- 每条可配置 `all/http/https/no_proxy`
- 每条显示可见地址（优先 all，其次 https/http）
- 每条可单独测试
- 新增“Provider 代理绑定”区域：
- 可为每个 provider 选择具体代理条目
- 可回退到全局兜底代理

涉及文件：
- `src/app/(dashboard)/dashboard/profile/page.js`
- `src/app/api/settings/proxy/test/route.js`
- `src/shared/i18n/locales.js`

## 3. 验证结果
- 已执行：`npm run build`
- 结果：编译通过。
- 备注：存在项目原有 standalone trace 路径告警（与本次功能无直接冲突）。

## 4. 已知限制
- 运行时代理基于 `undici ProxyAgent`，当前稳定覆盖 `http/https` 代理协议。
- 设置页测试接口支持 `socks` 测试（`socks-proxy-agent`）。
- 但运行时 `fetch` 主链路尚未完整支持 `socks` 作为上游代理（目前会降级直连并打印一次警告）。

## 5. 下一步计划

### 5.1 P0（建议先做）
- 补齐运行时 `socks4/socks5` 真正转发能力（不仅测试接口可用）。
- 为 provider 绑定增加“批量设置/清空”能力，降低配置成本。
- 在 provider 详情页增加当前绑定代理的可视化提示（便于排障）。

### 5.2 P1
- 增加代理健康状态缓存与展示（最近延迟、最近错误时间）。
- 增加代理可用性回退策略（某代理失败时是否自动回退全局代理）。
- 增加导入导出（JSON）能力，便于迁移代理配置。

### 5.3 P2
- 增加代理使用统计（按 provider / 按代理条目）。
- 增加操作审计记录（谁在何时修改了哪些绑定）。

## 6. 建议验收清单
- 在设置页新增 2 条代理并保存后，刷新页面配置不丢失。
- 不同 provider 绑定不同代理后，连接测试能分别成功/失败并符合预期。
- 模型拉取与聊天请求在绑定代理后仍可正常工作。
- 清空 provider 绑定后，可正确回退到全局代理设置。

## 7. 本次续做（2026-02-13）

### 7.1 已完成（P0）
- 已补齐运行时 `socks/socks4/socks5/socks5h` 真正转发能力：
  - 不再在主链路里对 socks 代理直接降级直连。
  - 在 `fetch` 运行时补丁中，为 socks 代理构建了自定义 `undici Agent(connect)`，通过 `socks` 隧道建链，并在 `https` 目标下完成 TLS 升级。
- 已在设置页新增 provider 绑定批量操作：
  - “全部绑定”：选择一个代理条目后可一键应用到当前 provider 列表。
  - “清空全部绑定”：一键清除当前 provider 列表绑定（含 `*` 默认绑定）。
- 已在 provider 详情页增加当前代理绑定可视化：
  - 显示当前 provider 是“绑定 profile / 走全局兜底 / 直连 / 绑定条目缺失”哪种状态。
  - 显示当前实际代理地址（若存在）。

涉及文件：
- `src/lib/proxy/fetchPatch.js`
- `src/app/(dashboard)/dashboard/profile/page.js`
- `src/app/(dashboard)/dashboard/providers/[id]/page.js`
- `src/shared/i18n/locales.js`

### 7.2 验证
- 已执行：`npm run build`
- 结果：通过（含新增改动）。
- 备注：仍有项目既有的 standalone trace 路径告警（`ENOENT` 指向 `C:\\Users\\hopemyl\\.9router`），与本次代理功能变更无直接冲突。
