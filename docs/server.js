const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const roomAdmins = {};
const bannedUsers = {};
const roomBots = {};

io.on('connection', (socket) => {
  socket.on('join', ({ room, name }) => {
    if (bannedUsers[room]?.has(name)) {
      socket.emit('message', { name: 'システム', message: 'あなたはBANされています。' });
      return;
    }

    socket.join(room);
    socket.data = { room, name };

    if (!roomAdmins[room]) {
      roomAdmins[room] = socket.id;
      socket.emit('message', { name: 'システム', message: 'あなたは管理者です。' });
    }

    io.to(room).emit('message', { name: 'システム', message: `${name} が入室しました。` });
  });

  socket.on('message', ({ room, name, message }) => {
    io.to(room).emit('message', { name, message });
  });

  socket.on('banUser', ({ room, targetName }) => {
    if (socket.id !== roomAdmins[room]) return;
    bannedUsers[room] ??= new Set();
    bannedUsers[room].add(targetName);
    io.to(room).emit('message', { name: 'システム', message: `${targetName} はBANされました。` });
  });

  socket.on('addBot', ({ room, botName }) => {
    if (socket.id !== roomAdmins[room]) return;
    roomBots[room] ??= [];
    if (roomBots[room].length >= 100) return;

    roomBots[room].push(botName);
    setInterval(() => {
      io.to(room).emit('message', {
        name: botName,
        message: 'こんにちは！BOTです。',
      });
    }, 5000);
  });

  socket.on('image', ({ room, name, image }) => {
    io.to(room).emit('image', { name, image });
  });
});

http.listen(PORT, () => {
  console.log(`✅ サーバー起動 http://localhost:${PORT}`);
});
