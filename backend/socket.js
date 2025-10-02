const {
  userQueries,
  roomQueries,
  messageQueries,
  friendshipQueries,
  encrypt,
  decrypt,
} = require('./database');

function initializeSocket(io, connectedUsers) {
  io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Usuario se conecta con su ID
    socket.on('user_connected', (userId) => {
      connectedUsers.set(userId, socket.id);
      userQueries.updateLastSeen.run(userId);

      // Notificar a amigos que el usuario está en línea
      const friends = friendshipQueries.getFriends.all(userId, userId, userId);
      friends.forEach((friend) => {
        const friendSocketId = connectedUsers.get(friend.id);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend_online', { userId, username: friend.username });
        }
      });

      console.log(`Usuario ${userId} conectado`);
    });

    // Unirse a una sala
    socket.on('join_room', ({ roomId, userId }) => {
      // Verificar si el usuario es miembro de la sala o si es una sala general
      const room = roomQueries.findById.get(roomId);

      if (room) {
        if (room.type === 'general') {
          // Unir a sala general automáticamente
          roomQueries.addMember.run(roomId, userId);
        }

        const isMember = roomQueries.isMember.get(roomId, userId);

        if (isMember.count > 0 || room.type === 'general') {
          socket.join(`room_${roomId}`);
          console.log(`Usuario ${userId} se unió a la sala ${roomId}`);
        }
      }
    });

    // Salir de una sala
    socket.on('leave_room', ({ roomId }) => {
      socket.leave(`room_${roomId}`);
      console.log(`Usuario salió de la sala ${roomId}`);
    });

    // Enviar mensaje - CORREGIDO
    socket.on('send_message', async ({ roomId, userId, content }) => {
      try {
        const isMember = roomQueries.isMember.get(roomId, userId);

        if (isMember.count > 0) {
          const encryptedContent = encrypt(content);
          const result = messageQueries.create.run(roomId, userId, encryptedContent);
          const messageId = result.lastInsertRowid;

          // Obtener el mensaje completo con información del usuario
          const message = messageQueries.getMessageWithUser.get(messageId);

          if (message) {
            io.to(`room_${roomId}`).emit('new_message', {
              id: message.id,
              roomId,
              content: content,
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
            });
          }
        }
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
      }
    });

    // Usuario está escribiendo
    socket.on('typing', ({ roomId, userId, username }) => {
      socket.to(`room_${roomId}`).emit('user_typing', { userId, username });
    });

    // Usuario dejó de escribir
    socket.on('stop_typing', ({ roomId, userId, username }) => {
      socket.to(`room_${roomId}`).emit('user_stop_typing', { userId, username });
    });

    // Marcar mensajes como leídos
    socket.on('mark_messages_read', ({ roomId, userId, messageIds }) => {
      try {
        messageIds.forEach((messageId) => {
          messageQueries.markAsRead.run(messageId, userId);
        });

        // Notificar a otros usuarios que estos mensajes fueron leídos
        socket.to(`room_${roomId}`).emit('messages_read', {
          userId,
          messageIds,
          roomId,
        });
      } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
      }
    });

    // Chat privado con un amigo
    socket.on('start_private_chat', ({ userId, friendId }) => {
      try {
        // Verificar que son amigos
        const areFriends = friendshipQueries.areFriends.get(userId, friendId, friendId, userId);

        if (areFriends.count > 0) {
          // Buscar sala privada existente
          let room = roomQueries.getPrivateRoom.get(userId, friendId);

          if (!room) {
            // Crear sala privada
            const user = userQueries.findById.get(userId);
            const friend = userQueries.findById.get(friendId);
            const roomName = `${user.display_name || user.username} & ${
              friend.display_name || friend.username
            }`;

            const result = roomQueries.create.run(roomName, 'private', userId);
            const roomId = result.lastInsertRowid;

            // Agregar ambos usuarios a la sala
            roomQueries.addMember.run(roomId, userId);
            roomQueries.addMember.run(roomId, friendId);

            room = { id: roomId, name: roomName, type: 'private' };
          }

          // Emitir evento al usuario que lo creó
          socket.emit('private_chat_created', {
            roomId: room.id,
            friendId,
          });

          // Notificar al amigo si está conectado
          const friendSocketId = connectedUsers.get(friendId);
          if (friendSocketId) {
            io.to(friendSocketId).emit('private_chat_notification', {
              roomId: room.id,
              userId,
            });
          }
        }
      } catch (error) {
        console.error('Error al crear chat privado:', error);
      }
    });

    // Crear grupo
    socket.on('create_group', ({ name, createdBy, members }) => {
      try {
        // Verificar que todos los miembros son amigos del creador
        const validMembers = members.filter((memberId) => {
          const areFriends = friendshipQueries.areFriends.get(
            createdBy,
            memberId,
            memberId,
            createdBy
          );
          return areFriends.count > 0;
        });

        if (validMembers.length > 0) {
          const result = roomQueries.create.run(name, 'group', createdBy);
          const roomId = result.lastInsertRowid;

          // Agregar creador
          roomQueries.addMember.run(roomId, createdBy);

          // Agregar miembros válidos
          validMembers.forEach((memberId) => {
            roomQueries.addMember.run(roomId, memberId);

            // Notificar a cada miembro
            const memberSocketId = connectedUsers.get(memberId);
            if (memberSocketId) {
              io.to(memberSocketId).emit('added_to_group', {
                roomId,
                roomName: name,
                createdBy,
              });
            }
          });

          socket.emit('group_created', {
            id: roomId,
            name,
            type: 'group',
          });
        }
      } catch (error) {
        console.error('Error al crear grupo:', error);
      }
    });

    // Desconexión
    socket.on('disconnect', () => {
      // Encontrar el userId asociado a este socket
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

        // Notificar a amigos que el usuario está offline
        const friends = friendshipQueries.getFriends.all(
          disconnectedUserId,
          disconnectedUserId,
          disconnectedUserId
        );
        friends.forEach((friend) => {
          const friendSocketId = connectedUsers.get(friend.id);
          if (friendSocketId) {
            io.to(friendSocketId).emit('friend_offline', { userId: disconnectedUserId });
          }
        });

        console.log(`Usuario ${disconnectedUserId} desconectado`);
      }
    });
  });
}

module.exports = { initializeSocket };
