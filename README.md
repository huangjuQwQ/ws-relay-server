# WebSocket Relay Server

为 Roblox 注入脚本提供“同样使用脚本的玩家”在线标记的中继服务。

## 部署到 Render

1. 将本仓库推送到 GitHub。
2. 登录 [Render](https://render.com)，点击 **New +** → **Blueprint**。
3. 连接本仓库，Render 会自动读取 `render.yaml` 并创建 Web Service。
4. 在环境变量中设置 `SECRET_TOKEN` 为一个长随机字符串（例如 32 位以上）。
5. 部署完成后，记下服务地址，例如 `https://ws-relay-server.onrender.com`。
6. 在客户端脚本中使用 `wss://ws-relay-server.onrender.com` 连接。

## 防止免费实例休眠

Render 免费实例在 15 分钟无入站流量后会休眠。客户端脚本已包含每 10 分钟发送一次的心跳，只要有一个玩家在线即可保活。若无人使用，可配置 UptimeRobot 每 10 分钟访问一次 `/health` 端点。

## 环境变量

- `SECRET_TOKEN`：必填，用于客户端连接鉴权，必须与客户端脚本中的 token 一致。