const { Client, LocalAuth } = require('whatsapp-web.js');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const QRCode = require('qrcode');

const PORT = parseInt(process.env.WA_WS_PORT || '11435', 10);
const SESSION_DIR = process.env.WA_SESSION_DIR || path.join(__dirname, 'session');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'running' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    try {
      ws.send(msg);
    } catch (_) {}
  }
}

let client = null;

function createClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    },
  });

  client.on('qr', async (qr) => {
    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      broadcast({ type: 'qr', qr: dataUrl });
    } catch {
      broadcast({ type: 'qr', qr });
    }
  });

  client.on('authenticated', () => {
    broadcast({ type: 'auth-state', state: 'authenticated' });
  });

  client.on('ready', () => {
    broadcast({ type: 'ready' });
    broadcast({ type: 'auth-state', state: 'ready' });
  });

  client.on('disconnected', (reason) => {
    broadcast({ type: 'auth-state', state: 'disconnected', reason });
    setTimeout(() => {
      createClient();
    }, 5000);
  });

  client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const phone = contact.number || msg.from.replace('@c.us', '').replace('@s.whatsapp.net', '');
    broadcast({
      type: 'message',
      from: phone,
      body: msg.body,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
    });
  });

  client.initialize();
}

async function handleSend(phone, message) {
  if (!client) return { error: 'Cliente no inicializado' };
  try {
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    const sent = await client.sendMessage(chatId, message);
    return { success: true, id: sent.id.id, timestamp: sent.timestamp };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleGetMessages(phone, limit = 50) {
  if (!client) return { error: 'Cliente no inicializado', messages: [] };
  try {
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    const chat = await client.getChatById(chatId);
    const msgs = await chat.fetchMessages({ limit });
    return {
      messages: msgs.map((m) => ({
        from: m.fromMe ? 'me' : (m.from || '').replace('@c.us', '').replace('@s.whatsapp.net', ''),
        body: m.body,
        timestamp: m.timestamp,
        fromMe: m.fromMe,
        id: m.id.id,
      })),
    };
  } catch (e) {
    return { error: e.message, messages: [] };
  }
}

async function handleGetChats() {
  if (!client) return { error: 'Cliente no inicializado', chats: [] };
  try {
    const chats = await client.getChats();
    const result = chats
      .filter((c) => c.isGroup === false)
      .slice(0, 100)
      .map((c) => ({
        phone: c.id.user || c.id._serialized.replace('@c.us', ''),
        name: c.name || c.id.user || 'Desconocido',
        lastMessage: c.lastMessage ? { body: c.lastMessage.body, timestamp: c.lastMessage.timestamp } : null,
        unreadCount: c.unreadCount,
      }));
    return { chats: result };
  } catch (e) {
    return { error: e.message, chats: [] };
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'auth-state',
    state: client && client.info ? 'ready' : 'connecting',
  }));

  ws.on('message', async (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.type === 'send') {
      const result = await handleSend(data.phone, data.message);
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'send-result', ...result, requestId: data.requestId }));
    } else if (data.type === 'get-messages') {
      const result = await handleGetMessages(data.phone, data.limit || 50);
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'messages', phone: data.phone, ...result, requestId: data.requestId }));
    } else if (data.type === 'get-chats') {
      const result = await handleGetChats();
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'chats', ...result, requestId: data.requestId }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

createClient();

server.listen(PORT, '127.0.0.1', () => {
  process.title = 'marketfinder-whatsapp';
  console.log(`[whatsapp] WebSocket server on port ${PORT}`);
});
