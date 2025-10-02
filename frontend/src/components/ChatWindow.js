import React, { useState, useEffect, useRef } from 'react';
import socket, { SOCKET_URL } from '../socket';
import useNotifications from '../hooks/useNotifications';

function ChatWindow({ room, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { showNotification } = useNotifications();

  // Efectos existentes
  useEffect(() => {
    loadMessages();

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [room.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleFocus = () => {
      const unreadMessages = messages.filter(
        (msg) => parseInt(msg.user_id) !== parseInt(user.id) && !msg.isRead
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        socket.emit('mark_messages_read', {
          roomId: room.id,
          userId: user.id,
          messageIds,
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [messages, room.id, user.id]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/rooms/${room.id}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    }
  };

  const handleNewMessage = (message) => {
    if (message.roomId === room.id) {
      setMessages((prev) => [...prev, message]);

      if (!document.hidden && parseInt(message.user_id) !== parseInt(user.id)) {
        setTimeout(() => {
          socket.emit('mark_messages_read', {
            roomId: room.id,
            userId: user.id,
            messageIds: [message.id],
          });
        }, 1000);
      }

      if (parseInt(message.user_id) !== parseInt(user.id) && document.hidden) {
        const senderName = message.display_name || message.username;
        const roomName = room.type === 'private' ? `Chat con ${senderName}` : room.name;

        showNotification(`💬 ${roomName}`, {
          body: `${senderName}: ${message.content}`,
          tag: `message-${room.id}`,
          requireInteraction: false,
          silent: false,
        });
      }
    }
  };

  const handleUserTyping = ({ userId, username }) => {
    if (userId !== user.id) {
      setTypingUsers((prev) => new Set([...prev, username]));
    }
  };

  const handleUserStopTyping = ({ userId, username }) => {
    if (userId !== user.id) {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    }
  };

  const handleMessagesRead = ({ userId, messageIds }) => {
    if (userId !== user.id) {
      setMessages((prev) =>
        prev.map((msg) => (messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg))
      );
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', {
        roomId: room.id,
        userId: user.id,
        username: user.username,
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop_typing', {
        roomId: room.id,
        userId: user.id,
        username: user.username,
      });
    }, 1000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (newMessage.trim()) {
      socket.emit('send_message', {
        roomId: room.id,
        userId: user.id,
        content: newMessage.trim(),
      });

      setNewMessage('');
      setIsTyping(false);
      socket.emit('stop_typing', {
        roomId: room.id,
        userId: user.id,
        username: user.username,
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoomIcon = () => {
    if (room.type === 'general') return '🌐';
    if (room.type === 'private') return '🔒';
    if (room.type === 'group') return '👪';
    return '💬';
  };

  // Función para obtener el nombre del remitente
  const getSenderName = (message) => {
    if (parseInt(message.user_id) === parseInt(user.id)) {
      return 'Tú';
    }
    return message.display_name || message.username || 'Usuario';
  };

  // Función para obtener la inicial del avatar
  const getAvatarInitial = (message) => {
    if (parseInt(message.user_id) === parseInt(user.id)) {
      return (
        user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'Y'
      );
    }
    return (
      message.display_name?.charAt(0).toUpperCase() ||
      message.username?.charAt(0).toUpperCase() ||
      'U'
    );
  };

  // Función para determinar si mostrar el nombre del remitente
  const shouldShowSenderName = (message, index) => {
    if (parseInt(message.user_id) === parseInt(user.id)) return false;
    if (room.type === 'private') return false;

    // Mostrar nombre si es el primer mensaje o si el mensaje anterior es de otro usuario
    if (index === 0) return true;
    const previousMessage = messages[index - 1];
    return previousMessage.user_id !== message.user_id;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-violet-900/90 backdrop-blur-xl border-b border-white/10 p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <span className="text-xl">{getRoomIcon()}</span>
              </div>
              {room.type === 'private' && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-gray-900 rounded-full shadow-lg"></div>
              )}
            </div>
            <div className="flex flex-col">
              <h2 className="text-white font-bold text-lg">{room.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                {room.type === 'general' && (
                  <span className="flex items-center bg-blue-500/20 px-2 py-1 rounded-full border border-blue-500/30">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse"></span>
                    <span className="text-gray-300 text-xs">Sala General</span>
                  </span>
                )}
                {room.type === 'private' && (
                  <span className="flex items-center bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                    <span className="text-gray-300 text-xs">Chat Privado</span>
                  </span>
                )}
                {room.type === 'group' && (
                  <span className="flex items-center bg-purple-500/20 px-2 py-1 rounded-full border border-purple-500/30">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1.5 animate-pulse"></span>
                    <span className="text-gray-300 text-xs">Grupo</span>
                  </span>
                )}
                <span className="text-gray-400 text-xs">• {messages.length} mensajes</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-110 backdrop-blur-sm"
            title="Cerrar chat"
          >
            <div className="w-5 h-5 flex items-center justify-center font-bold">✕</div>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-gray-900/95 via-gray-800/95 to-gray-900/95 relative">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 max-w-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-xl">💬</span>
              </div>
              <p className="text-gray-300 mb-1 font-semibold">No hay mensajes aún</p>
              <p className="text-gray-500 text-xs">Sé el primero en enviar un mensaje</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = parseInt(message.user_id) === parseInt(user.id);
            const showSenderName = shouldShowSenderName(message, index);

            return (
              <div
                key={message.id || index}
                className={`flex items-start space-x-3 ${
                  isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar - Solo mostrar en chats grupales o cuando cambia el remitente */}
                {(room.type === 'group' || room.type === 'general' || showSenderName) && (
                  <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                        isOwnMessage
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25'
                          : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/25'
                      }`}
                    >
                      {getAvatarInitial(message)}
                    </div>
                  </div>
                )}

                {/* Espacio para alinear cuando no hay avatar */}
                {!(room.type === 'group' || room.type === 'general' || showSenderName) && (
                  <div className="w-8 flex-shrink-0"></div>
                )}

                <div
                  className={`flex flex-col ${
                    isOwnMessage ? 'items-end' : 'items-start'
                  } max-w-xs sm:max-w-sm md:max-w-md flex-1`}
                >
                  {/* Nombre del remitente */}
                  {showSenderName && (
                    <div className="text-purple-300 text-xs font-semibold mb-1 px-1">
                      {getSenderName(message)}
                    </div>
                  )}

                  {/* Burbuja del mensaje */}
                  <div
                    className={`relative px-3 py-2 rounded-xl shadow-lg backdrop-blur-sm ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-br-md'
                        : 'bg-gray-700/80 text-white rounded-bl-md border border-white/10'
                    }`}
                  >
                    <p className="break-words text-sm leading-relaxed">{message.content}</p>

                    {/* Timestamp dentro de la burbuja */}
                    <div
                      className={`text-xs mt-1 flex justify-end ${
                        isOwnMessage ? 'text-emerald-100' : 'text-gray-300'
                      }`}
                    >
                      <span>{formatTime(message.created_at)}</span>
                      {isOwnMessage && (
                        <span className="ml-1">{message.read_count > 0 ? '✓✓' : '✓'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Indicador de escritura */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-gray-300 text-sm p-3 bg-gray-700/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg animate-pulse">
            <div className="flex space-x-1 bg-purple-500/20 p-1.5 rounded-full">
              <div
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
            <span className="font-medium">
              {Array.from(typingUsers).join(', ')}
              {typingUsers.size === 1 ? ' está escribiendo...' : ' están escribiendo...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gradient-to-r from-gray-800/95 via-gray-800/90 to-gray-800/95 backdrop-blur-xl border-t border-white/10 p-4 shadow-2xl">
        <form onSubmit={handleSendMessage}>
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Escribe tu mensaje..."
                className="w-full px-4 py-3 bg-gray-700/60 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all duration-300 text-sm shadow-lg"
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 font-medium bg-gray-800/60 px-2 py-0.5 rounded-full">
                {newMessage.length}/500
              </div>
            </div>

            <button
              type="submit"
              className={`px-5 py-3 rounded-xl font-bold transition-all duration-300 transform shadow-lg ${
                newMessage.trim()
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:scale-105 hover:shadow-purple-500/40 active:scale-95'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!newMessage.trim()}
            >
              <div className="flex items-center justify-center w-5 h-5">
                {newMessage.trim() ? '🚀' : '➤'}
              </div>
            </button>
          </div>
        </form>

        {/* Indicadores de estado */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <span>Conectado</span>
            </span>
            <span>{messages.length} mensajes</span>
          </div>
          <span className="text-gray-500">
            {room.type === 'private' ? 'Cifrado extremo a extremo' : 'Mensajes públicos'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
