# WebSocket Relay Server

为 Roblox 注入脚本提供“同样使用脚本的玩家”在线标记的中继服务。

## 架构：HTTP 轮询（Polling）

由于多数 Roblox 注入执行器不提供可用的 WebSocket API，本服务已从「WebSocket 推送」改为 **HTTP 轮询** 架构。

- 客户端**每 5 秒**发送一次 `GET /poll` 请求，同时完成两件事：
  1. **上报**自己的在线状态（携带 `userId`、`name`、`token`）
  2. **拉取**当前完整在线名单（响应体为 `{ code: 200, data: [...] }`）
- 服务端记录每个玩家的 `lastPing` 时间戳，后台每 5 秒扫描一次，**超过 15 秒**未上报的玩家会被自动清理下线。
- 玩家退出时也可主动请求 `GET /leave` 立即下线（非必需，超时机制会兜底）。

## API

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/health` | GET | 健康检查，返回 `OK` |
| `/poll?userId=&name=&token=` | GET | 上报在线状态并返回在线名单；token 错误返回 `401` |
| `/leave?userId=` | GET | 主动下线 |

## 关于 Render 免费实例休眠

**休眠问题已被 HTTP 轮询自动解决。** 免费实例在 15 分钟无入站流量后会休眠，而客户端每 5 秒就会发起一次 `/poll` 请求，本身就是持续入站流量，因此只要有任意一个玩家在线，实例就会保持唤醒，**无需再额外配置 UptimeRobot 等外部保活服务**。

（若完全无人使用，实例仍会正常休眠，这属于预期行为，首个请求会触发冷启动。）

## 部署到 Render

1. 将本仓库推送到 GitHub。
2. 登录 [Render](https://render.com)，点击 **New +** → **Blueprint**。
3. 连接本仓库，Render 会自动读取 `render.yaml` 并创建 Web Service。
4. 在环境变量中设置 `SECRET_TOKEN` 为一个长随机字符串（例如 32 位以上）。
5. 部署完成后，记下服务地址，例如 `https://ws-relay-server.onrender.com`。
6. 在客户端脚本中使用 `https://` 地址请求 `/poll` 端点。

## 环境变量

- `SECRET_TOKEN`：必填，用于客户端连接鉴权，必须与客户端脚本中的 token 一致。