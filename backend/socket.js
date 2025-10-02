const {
  userQueries,
  roomQueries,
  messageQueries,
  friendshipQueries,
  encrypt,
  decrypt,
} = require('./database');

// Utilidades
const validateInput = (data, requiredFields) => {
  return requiredFields.every((field) => data[field] !== undefined && data[field] !== null);
};

const notifyFriends = (io, userId, connectedUsers, friendshipQueries, event, data) => {
  try {
    const friends = friendshipQueries.getFriends.all(userId, userId, userId);
    friends.forEach((friend) => {
      const friendSocketId = connectedUsers.get(friend.id);
      if (friendSocketId) {
        io.to(friendSocketId).emit(event, { userId, ...data });
      }
    });
  } catch (error) {
    console.error(`Error notificando amigos (${event}):`, error);
  }
};

function initializeSocket(io, connectedUsers) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Usuario conectado: ${socket.id}`);

    // Usuario se conecta con su ID
    socket.on('user_connected', async (userId) => {
      try {
        if (!userId) {
          console.error('[user_connected] userId no proporcionado');
          return;
        }

        connectedUsers.set(userId, socket.id);
        userQueries.updateLastSeen.run(userId);

        // Notificar a amigos que el usuario está en línea
        notifyFriends(io, userId, connectedUsers, friendshipQueries, 'friend_online', {
          username: userQueries.findById.get(userId)?.username,
        });

        console.log(`[user_connected] Usuario ${userId} conectado`);
      } catch (error) {
        console.error('[user_connected] Error:', error);
      }
    });

    // Unirse a una sala
    socket.on('join_room', async ({ roomId, userId }) => {
      try {
        if (!validateInput({ roomId, userId }, ['roomId', 'userId'])) {
          console.error('[join_room] Parámetros inválidos');
          return socket.emit('error', { message: 'Parámetros inválidos' });
        }

        const room = roomQueries.findById.get(roomId);

        if (!room) {
          console.error(`[join_room] Sala ${roomId} no encontrada`);
          return socket.emit('error', { message: 'Sala no encontrada' });
        }

        // Auto-unión a salas generales
        if (room.type === 'general') {
          const isMember = roomQueries.isMember.get(roomId, userId);
          if (isMember.count === 0) {
            roomQueries.addMember.run(roomId, userId);
          }
        }

        const isMember = roomQueries.isMember.get(roomId, userId);

        if (isMember.count > 0) {
          socket.join(`room_${roomId}`);
          console.log(`[join_room] Usuario ${userId} se unió a sala ${roomId}`);
          socket.emit('room_joined', { roomId });
        } else {
          socket.emit('error', { message: 'No eres miembro de esta sala' });
        }
      } catch (error) {
        console.error('[join_room] Error:', error);
        socket.emit('error', { message: 'Error al unirse a la sala' });
      }
    });

    // Salir de una sala
    socket.on('leave_room', ({ roomId }) => {
      try {
        if (!roomId) return;
        socket.leave(`room_${roomId}`);
        console.log(`[leave_room] Usuario salió de sala ${roomId}`);
      } catch (error) {
        console.error('[leave_room] Error:', error);
      }
    });

    // Enviar mensaje
    socket.on('send_message', async ({ roomId, userId, content }) => {
      try {
        if (!validateInput({ roomId, userId, content }, ['roomId', 'userId', 'content'])) {
          console.error('[send_message] Parámetros inválidos');
          return socket.emit('error', { message: 'Parámetros inválidos' });
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
          return socket.emit('error', { message: 'Contenido inválido' });
        }

        const isMember = roomQueries.isMember.get(roomId, userId);

        if (isMember.count === 0) {
          return socket.emit('error', { message: 'No eres miembro de esta sala' });
        }

        const encryptedContent = encrypt(content.trim());
        const result = messageQueries.create.run(roomId, userId, encryptedContent);
        const messageId = result.lastInsertRowid;

        const message = messageQueries.getMessageWithUser.get(messageId);
        console.log(message);
        if (!message) {
          throw new Error('No se pudo recuperar el mensaje creado');
        }

        const messagePayload = {
          id: message.id,
          roomId,
          content: content.trim(),
          user_id: message.user_id,
          display_name: message.display_name,
          username: message.username,
          created_at: message.created_at,
          isRead: false,
          read_count: 0,
          user: {
            id: message.user_id,
            username: message.username,
            displayName: message.display_name,
          },
        };

        io.to(`room_${roomId}`).emit('new_message', messagePayload);
        console.log(`[send_message] Mensaje ${messageId} enviado a sala ${roomId}`);
      } catch (error) {
        console.error('[send_message] Error:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });

    // Usuario está escribiendo
    socket.on('typing', ({ roomId, userId, username }) => {
      try {
        if (!validateInput({ roomId, userId }, ['roomId', 'userId'])) return;
        socket.to(`room_${roomId}`).emit('user_typing', { userId, username });
      } catch (error) {
        console.error('[typing] Error:', error);
      }
    });

    // Usuario dejó de escribir
    socket.on('stop_typing', ({ roomId, userId, username }) => {
      try {
        if (!validateInput({ roomId, userId }, ['roomId', 'userId'])) return;
        socket.to(`room_${roomId}`).emit('user_stop_typing', { userId, username });
      } catch (error) {
        console.error('[stop_typing] Error:', error);
      }
    });

    // Marcar mensajes como leídos
    socket.on('mark_messages_read', ({ roomId, userId, messageIds }) => {
      try {
        if (!validateInput({ roomId, userId, messageIds }, ['roomId', 'userId', 'messageIds'])) {
          return console.error('[mark_messages_read] Parámetros inválidos');
        }

        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        messageIds.forEach((messageId) => {
          messageQueries.markAsRead.run(messageId, userId);
        });

        socket.to(`room_${roomId}`).emit('messages_read', {
          userId,
          messageIds,
          roomId,
        });

        console.log(`[mark_messages_read] ${messageIds.length} mensajes marcados como leídos`);
      } catch (error) {
        console.error('[mark_messages_read] Error:', error);
      }
    });

    // Chat privado con un amigo
    socket.on('start_private_chat', async ({ userId, friendId }) => {
      try {
        if (!validateInput({ userId, friendId }, ['userId', 'friendId'])) {
          return socket.emit('error', { message: 'Parámetros inválidos' });
        }

        if (userId === friendId) {
          return socket.emit('error', { message: 'No puedes chatear contigo mismo' });
        }

        const areFriends = friendshipQueries.areFriends.get(userId, friendId, friendId, userId);

        if (areFriends.count === 0) {
          return socket.emit('error', { message: 'No son amigos' });
        }

        let room = roomQueries.getPrivateRoom.get(userId, friendId);

        if (!room) {
          const user = userQueries.findById.get(userId);
          const friend = userQueries.findById.get(friendId);

          if (!user || !friend) {
            return socket.emit('error', { message: 'Usuario no encontrado' });
          }

          const roomName = `${user.display_name || user.username} & ${
            friend.display_name || friend.username
          }`;

          const result = roomQueries.create.run(roomName, 'private', userId);
          const roomId = result.lastInsertRowid;

          roomQueries.addMember.run(roomId, userId);
          roomQueries.addMember.run(roomId, friendId);

          room = { id: roomId, name: roomName, type: 'private' };
        }

        socket.emit('private_chat_created', {
          roomId: room.id,
          friendId,
        });

        const friendSocketId = connectedUsers.get(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit('private_chat_notification', {
            roomId: room.id,
            userId,
          });
        }

        console.log(`[start_private_chat] Chat privado ${room.id} entre ${userId} y ${friendId}`);
      } catch (error) {
        console.error('[start_private_chat] Error:', error);
        socket.emit('error', { message: 'Error al crear chat privado' });
      }
    });

    // Crear grupo
    socket.on('create_group', async ({ name, createdBy, members }) => {
      try {
        if (!validateInput({ name, createdBy, members }, ['name', 'createdBy', 'members'])) {
          return socket.emit('error', { message: 'Parámetros inválidos' });
        }

        if (!Array.isArray(members) || members.length === 0) {
          return socket.emit('error', { message: 'Debe haber al menos un miembro' });
        }

        if (typeof name !== 'string' || name.trim().length === 0) {
          return socket.emit('error', { message: 'Nombre de grupo inválido' });
        }

        // Verificar que todos los miembros son amigos del creador
        const validMembers = members.filter((memberId) => {
          if (memberId === createdBy) return false;
          const areFriends = friendshipQueries.areFriends.get(
            createdBy,
            memberId,
            memberId,
            createdBy
          );
          return areFriends.count > 0;
        });

        if (validMembers.length === 0) {
          return socket.emit('error', { message: 'Ningún miembro válido' });
        }

        const result = roomQueries.create.run(name.trim(), 'group', createdBy);
        const roomId = result.lastInsertRowid;

        roomQueries.addMember.run(roomId, createdBy);

        validMembers.forEach((memberId) => {
          roomQueries.addMember.run(roomId, memberId);

          const memberSocketId = connectedUsers.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('added_to_group', {
              roomId,
              roomName: name.trim(),
              createdBy,
            });
          }
        });

        socket.emit('group_created', {
          id: roomId,
          name: name.trim(),
          type: 'group',
        });

        console.log(`[create_group] Grupo ${roomId} creado por ${createdBy}`);
      } catch (error) {
        console.error('[create_group] Error:', error);
        socket.emit('error', { message: 'Error al crear grupo' });
      }
    });

    // Desconexión
    socket.on('disconnect', () => {
      try {
        let disconnectedUserId;
        for (const [userId, socketId] of connectedUsers.entries()) {
          if (socketId === socket.id) {
            disconnectedUserId = userId;
            connectedUsers.delete(userId);
            break;
          }
        }

        if (disconnectedUserId) {
          userQueries.updateLastSeen.run(disconnectedUserId);

          notifyFriends(
            io,
            disconnectedUserId,
            connectedUsers,
            friendshipQueries,
            'friend_offline',
            {}
          );

          console.log(`[disconnect] Usuario ${disconnectedUserId} desconectado`);
        }
      } catch (error) {
        console.error('[disconnect] Error:', error);
      }
    });
  });
}

module.exports = { initializeSocket };
