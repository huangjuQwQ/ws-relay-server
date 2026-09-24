const http = require('http');

const PORT = process.env.PORT || 8080;
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'change-me-to-a-long-random-string';

// 在线表：userId -> { userId, name, lastPing }
const online = new Map();

function parseQuery(url) {
    const query = {};
    const index = url.indexOf('?');
    if (index !== -1) {
        const parts = url.slice(index + 1).split('&');
        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key && value) query[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    }
    return query;
}

// 定时清理超时玩家（15秒无心跳视为离线）
setInterval(() => {
    const now = Date.now();
    for (const [uid, info] of online.entries()) {
        if (now - info.lastPing > 15000) {
            online.delete(uid);
            console.log(`[自动清理] ${info.name} (${uid}) 超时下线`);
        }
    }
}, 5000);

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const query = parseQuery(req.url);

    // 1. 健康检查
    if (req.url.startsWith('/health')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('OK');
    }

    // 2. 上报在线 (客户端每5秒请求一次这个接口)
    if (req.url.startsWith('/poll')) {
        const { userId, name, token } = query;

        if (token !== SECRET_TOKEN) {
            res.writeHead(401);
            return res.end('Invalid token');
        }

        if (userId) {
            online.set(userId, { userId: userId, name: name || 'Unknown', lastPing: Date.now() });
        }

        const list = Array.from(online.values()).map(o => ({ userId: o.userId, name: o.name }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ code: 200, data: list }));
    }

    // 3. 主动离开
    if (req.url.startsWith('/leave')) {
        const { userId } = query;
        if (userId && online.has(userId)) {
            online.delete(userId);
        }
        res.writeHead(200);
        return res.end('OK');
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`HTTP 轮询服务器运行在端口 ${PORT}`);
});