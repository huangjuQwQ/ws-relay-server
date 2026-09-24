const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'change-me-to-a-long-random-string';

// 在线表：userId -> { userId, name, socket }
const online = new Map();

// 创建 HTTP 服务器，用于健康检查和 WebSocket 升级
const server = http.createServer((req, res) => {
    // 健康检查端点，Render 会定期访问
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
    }
    res.writeHead(404);
    res.end();
});

const wss = new WebSocket.Server({ server });

function broadcast(type, data, excludeWs = null) {
    const msg = JSON.stringify({ type, data });
    for (const info of online.values()) {
        if (info.socket !== excludeWs && info.socket.readyState === WebSocket.OPEN) {
            info.socket.send(msg);
        }
    }
}

wss.on('connection', (ws) => {
    let selfId = null;

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        if (msg.type === 'join') {
            // 鉴权
            if (msg.token !== SECRET_TOKEN) {
                ws.close(4001, 'Invalid token');
                return;
            }
            selfId = String(msg.userId);
            online.set(selfId, { userId: selfId, name: msg.name, socket: ws });

            // 回发当前完整在线列表
            ws.send(JSON.stringify({
                type: 'sync',
                data: Array.from(online.values()).map(o => ({ userId: o.userId, name: o.name }))
            }));

            // 通知其他人
            broadcast('add', { userId: selfId, name: msg.name }, ws);
            console.log(`[+] ${msg.name} (${selfId}) 上线，当前在线 ${online.size}`);
        }

        if (msg.type === 'leave' && selfId) {
            online.delete(selfId);
            broadcast('remove', { userId: selfId }, ws);
            console.log(`[-] ${selfId} 主动离开，当前在线 ${online.size}`);
            selfId = null;
        }

        if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
        }
    });

    ws.on('close', () => {
        if (selfId && online.has(selfId)) {
            online.delete(selfId);
            broadcast('remove', { userId: selfId });
            console.log(`[x] ${selfId} 断线清理，当前在线 ${online.size}`);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

server.listen(PORT, () => {
    console.log(`中继服务器运行在端口 ${PORT}`);
});