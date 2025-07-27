const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { Client } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, {
	cors: { origin: '*' },
});

app.use(cors());

// Create a new client instance
const client = new Client();

// When the client is ready, run this code (only once)
client.once('ready', async () => {
	console.log('Connected!');
	let chats = await client.getChats();
	io.emit('ready', chats);
	console.log('Sent chats!');
});

// When the client received QR-Code
client.on('qr', async (qr) => {
	// Convert QR string to data URL (base64 image)
	const qrImage = await QRCode.toDataURL(qr);
	io.emit('qr', qrImage);
});

// Start your client
client.initialize();

client.on('message_create', async (message) => {
	let chats = await client.getChats();

	let chatIdForMessage = (await message.getChat()).id._serialized;

	const chat = chats.find((chat) => chat.id._serialized === chatIdForMessage);

	if (chat) {
		chat.lastMessage = message;
	}

	chats.sort((a, b) => {
		const timestampA = a.lastMessage ? a.lastMessage.timestamp : 0;
		const timestampB = b.lastMessage ? b.lastMessage.timestamp : 0;

		return timestampB - timestampA;
	});

	io.emit('message_create', chats);
});

server.listen(4000, () =>
	console.log('Server running on http://localhost:4000')
);

app.get('/api/messages/:chatId', async (req, res) => {
	const { chatId } = req.params;
	try {
		const chat = await client.getChatById(chatId);
		const messages = await chat.fetchMessages({ limit: 50 });
		res.json(messages);
	} catch (err) {
		console.error('Error fetching messages:', err);
		res.status(500).json({ error: 'Failed to fetch messages' });
	}
});

app.post('/api/messages/send-message', async (req, res) => {
	const { chatId, message } = req.body;
	try {
		const chat = await client.getChatById(chatId);
		await chat.sendMessage(message);
		res.status(200).json({ success: true });
	} catch (error) {
		console.error('Error sending message:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});
