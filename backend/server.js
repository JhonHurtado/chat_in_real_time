const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;
const connectedUsers = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware de validación
const validateRequired = (fields) => (req, res, next) => {
  const missing = fields.filter((field) => !req.body[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      missing,
    });
  }
  next();
};

const validatePositiveInt =
  (param, source = 'params') =>
  (req, res, next) => {
    const value = parseInt(req[source][param]);
    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ error: `${param} debe ser un número positivo` });
    }
    req[source][param] = value;
    next();
  };

// Middleware de manejo de errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Variables globales para queries
let userQueries, friendshipQueries, roomQueries, messageQueries, decrypt;

// ==================== AUTENTICACIÓN ====================

app.post(
  '/api/register',
  validateRequired(['username', 'password', 'displayName']),
  asyncHandler(async (req, res) => {
    const { username, password, displayName } = req.body;

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'El usuario debe tener entre 3 y 20 caracteres' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res
        .status(400)
        .json({ error: 'El usuario solo puede contener letras, números y guiones bajos' });
    }

    const existingUser = userQueries.findByUsername.get(username.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = userQueries.create.run(
      username.toLowerCase(),
      hashedPassword,
      displayName.trim()
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: result.lastInsertRowid,
        username: username.toLowerCase(),
        displayName: displayName.trim(),
      },
    });
  })
);

app.post(
  '/api/login',
  validateRequired(['username', 'password']),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const user = userQueries.findByUsername.get(username.toLowerCase());
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
        displayName: user.display_name,
      },
    });
  })
);

// ==================== USUARIOS ====================

app.get(
  '/api/users/search',
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    if (q.length < 2) {
      return res.status(400).json({ error: 'La búsqueda debe tener al menos 2 caracteres' });
    }

    const searchTerm = `%${q.trim()}%`;
    const users = userQueries.search.all(searchTerm, searchTerm);
    res.json(users);
  })
);

app.get(
  '/api/users',
  asyncHandler(async (req, res) => {
    const users = userQueries.getAll.all();
    res.json(users);
  })
);

// ==================== AMISTAD ====================

app.post(
  '/api/friends/request',
  validateRequired(['userId', 'friendId']),
  asyncHandler(async (req, res) => {
    const userIdNum = parseInt(req.body.userId);
    const friendIdNum = parseInt(req.body.friendId);

    if (isNaN(userIdNum) || isNaN(friendIdNum)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    if (userIdNum === friendIdNum) {
      return res.status(400).json({ error: 'No puedes enviarte solicitud a ti mismo' });
    }

    const user = userQueries.findById.get(userIdNum);
    const friend = userQueries.findById.get(friendIdNum);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!friend) {
      return res.status(404).json({ error: 'Usuario destinatario no encontrado' });
    }

    const existing = friendshipQueries.findBetween.get(
      userIdNum,
      friendIdNum,
      friendIdNum,
      userIdNum
    );

    if (existing) {
      switch (existing.status) {
        case 'accepted':
          return res.status(409).json({ error: 'Ya son amigos' });
        case 'pending':
          if (existing.user_id === userIdNum) {
            return res.status(409).json({ error: 'Solicitud ya enviada' });
          }
          return res.status(409).json({ error: 'Este usuario ya te envió una solicitud' });
        case 'rejected':
          friendshipQueries.deleteRejected.run(
            userIdNum,
            friendIdNum,
            friendIdNum,
            userIdNum,
            'rejected'
          );
          break;
      }
    }

    friendshipQueries.create.run(userIdNum, friendIdNum, 'pending');

    const friendSocketId = connectedUsers.get(friendIdNum);
    if (friendSocketId) {
      io.to(friendSocketId).emit('friend_request', { from: user });
    }

    res.status(201).json({ message: 'Solicitud enviada exitosamente' });
  })
);

app.post(
  '/api/friends/respond',
  validateRequired(['requestId', 'accept']),
  asyncHandler(async (req, res) => {
    const { requestId, accept } = req.body;
    const requestIdNum = parseInt(requestId);

    if (isNaN(requestIdNum)) {
      return res.status(400).json({ error: 'ID de solicitud inválido' });
    }

    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'El campo accept debe ser booleano' });
    }

    const status = accept ? 'accepted' : 'rejected';
    const changes = friendshipQueries.updateStatus.run(status, requestIdNum);

    if (changes.changes === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ message: accept ? 'Solicitud aceptada' : 'Solicitud rechazada' });
  })
);

app.get(
  '/api/friends/:userId',
  validatePositiveInt('userId'),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const friends = friendshipQueries.getFriends.all(userId, userId, userId);
    res.json(friends);
  })
);

app.get(
  '/api/friends/requests/:userId',
  validatePositiveInt('userId'),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const requests = friendshipQueries.getPendingRequests.all(userId);
    res.json(requests);
  })
);

// ==================== SALAS ====================

app.get(
  '/api/rooms/general',
  asyncHandler(async (req, res) => {
    const rooms = roomQueries.getGeneral.all();
    res.json(rooms);
  })
);

app.get(
  '/api/rooms/user/:userId',
  validatePositiveInt('userId'),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const rooms = roomQueries.getUserRooms.all(userId);
    res.json(rooms);
  })
);

app.post(
  '/api/rooms/create',
  validateRequired(['name', 'type', 'createdBy']),
  asyncHandler(async (req, res) => {
    const { name, type, createdBy, members } = req.body;

    if (!name.trim() || name.trim().length < 3) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
    }

    if (!['general', 'group', 'private'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de sala inválido' });
    }

    const createdByNum = parseInt(createdBy);
    if (isNaN(createdByNum)) {
      return res.status(400).json({ error: 'ID de creador inválido' });
    }

    const creator = userQueries.findById.get(createdByNum);
    if (!creator) {
      return res.status(404).json({ error: 'Usuario creador no encontrado' });
    }

    const result = roomQueries.create.run(name.trim(), type, createdByNum);
    const roomId = result.lastInsertRowid;

    roomQueries.addMember.run(roomId, createdByNum);

    if (Array.isArray(members) && members.length > 0) {
      members.forEach((memberId) => {
        const memberIdNum = parseInt(memberId);
        if (!isNaN(memberIdNum) && memberIdNum !== createdByNum) {
          roomQueries.addMember.run(roomId, memberIdNum);
        }
      });
    }

    res.status(201).json({
      id: roomId,
      name: name.trim(),
      type,
      created_by: createdByNum,
    });
  })
);

app.get(
  '/api/rooms/:roomId/messages',
  validatePositiveInt('roomId'),
  asyncHandler(async (req, res) => {
    const roomId = req.params.roomId;
    const { userId } = req.query;

    if (userId) {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        const isMember = roomQueries.isMember.get(roomId, userIdNum);
        if (!isMember || isMember.count === 0) {
          return res.status(403).json({ error: 'No tienes acceso a esta sala' });
        }
      }
    }

    const messages = messageQueries.getByRoom.all(roomId);

    const decryptedMessages = messages
      .map((msg) => {
        try {
          return {
            ...msg,
            content: decrypt(msg.content),
          };
        } catch (error) {
          console.error(`Error al desencriptar mensaje ${msg.id}:`, error);
          return {
            ...msg,
            content: '[Mensaje no disponible]',
          };
        }
      })
      .reverse();

    res.json(decryptedMessages);
  })
);

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ==================== MANEJO DE ERRORES ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { message: err.message }),
  });
});

// ==================== INICIALIZACIÓN ====================

async function startServer() {
  try {
    // Cargar y esperar la inicialización de la base de datos
    const database = require('./database');
    await database.dbPromise;
    
    // Asignar queries globalmente
    userQueries = database.userQueries;
    friendshipQueries = database.friendshipQueries;
    roomQueries = database.roomQueries;
    messageQueries = database.messageQueries;
    decrypt = database.decrypt;
    
    // Inicializar socket
    const { initializeSocket } = require('./socket');
    initializeSocket(io, connectedUsers);

    // Iniciar servidor
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌐 Accesible en red local en http://<TU_IP_LOCAL>:${PORT}`);
      console.log(`📡 WebSocket habilitado\n`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = { app, server, io };