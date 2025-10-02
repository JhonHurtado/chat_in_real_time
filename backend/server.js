require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { userQueries, friendshipQueries, roomQueries, messageQueries, encrypt, decrypt } = require('./database');
const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Almacenar usuarios conectados
const connectedUsers = new Map();

// Rutas de autenticación
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const existingUser = userQueries.findByUsername.get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = userQueries.create.run(username, hashedPassword, displayName);

    res.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: result.lastInsertRowid,
        username,
        displayName
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = userQueries.findByUsername.get(username);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    userQueries.updateLastSeen.run(user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Rutas de usuarios
app.get('/api/users/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;
    const users = userQueries.search.all(searchTerm, searchTerm);
    res.json(users);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error al buscar usuarios' });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = userQueries.getAll.all();
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Rutas de amistad
app.post('/api/friends/request', (req, res) => {
  try {
    const { userId, friendId } = req.body;

    if (userId === friendId) {
      return res.status(400).json({ error: 'No puedes enviarte solicitud a ti mismo' });
    }

    const existing = friendshipQueries.findBetween.get(userId, friendId, friendId, userId);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una solicitud o amistad' });
    }

    friendshipQueries.create.run(userId, friendId, 'pending');
    
    // Notificar por socket
    const friendSocketId = connectedUsers.get(friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit('friend_request', {
        from: userQueries.findById.get(userId)
      });
    }

    res.json({ message: 'Solicitud enviada' });
  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
});

app.post('/api/friends/respond', (req, res) => {
  try {
    const { requestId, accept } = req.body;

    const status = accept ? 'accepted' : 'rejected';
    friendshipQueries.updateStatus.run(status, requestId);

    res.json({ message: accept ? 'Solicitud aceptada' : 'Solicitud rechazada' });
  } catch (error) {
    console.error('Error al responder solicitud:', error);
    res.status(500).json({ error: 'Error al responder solicitud' });
  }
});

app.get('/api/friends/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const friends = friendshipQueries.getFriends.all(userId, userId, userId);
    res.json(friends);
  } catch (error) {
    console.error('Error al obtener amigos:', error);
    res.status(500).json({ error: 'Error al obtener amigos' });
  }
});

app.get('/api/friends/requests/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const requests = friendshipQueries.getPendingRequests.all(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Rutas de salas
app.get('/api/rooms/general', (req, res) => {
  try {
    const rooms = roomQueries.getGeneral.all();
    res.json(rooms);
  } catch (error) {
    console.error('Error al obtener salas generales:', error);
    res.status(500).json({ error: 'Error al obtener salas' });
  }
});

app.get('/api/rooms/user/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const rooms = roomQueries.getUserRooms.all(userId);
    res.json(rooms);
  } catch (error) {
    console.error('Error al obtener salas del usuario:', error);
    res.status(500).json({ error: 'Error al obtener salas' });
  }
});

app.post('/api/rooms/create', (req, res) => {
  try {
    const { name, type, createdBy, members } = req.body;

    const result = roomQueries.create.run(name, type, createdBy);
    const roomId = result.lastInsertRowid;

    // Agregar miembros
    if (members && members.length > 0) {
      members.forEach(memberId => {
        roomQueries.addMember.run(roomId, memberId);
      });
    }

    // Agregar al creador
    roomQueries.addMember.run(roomId, createdBy);

    res.json({
      id: roomId,
      name,
      type,
      created_by: createdBy
    });
  } catch (error) {
    console.error('Error al crear sala:', error);
    res.status(500).json({ error: 'Error al crear sala' });
  }
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const messages = messageQueries.getByRoom.all(roomId);

    const decryptedMessages = messages.map(msg => ({
      ...msg,
      content: decrypt(msg.content)
    })).reverse();

    res.json(decryptedMessages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Inicializar Socket.IO
initializeSocket(io, connectedUsers);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Accesible en red local en http://<TU_IP_LOCAL>:${PORT}\n`);
});

module.exports = { app, server, io };