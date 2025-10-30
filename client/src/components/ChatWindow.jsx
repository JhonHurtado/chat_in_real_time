import React, { useState, useEffect, useRef } from 'react';
import socket, { SOCKET_URL } from '../socket';

function ChatWindow({ room, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- Cargar mensajes y suscripciones ---
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // --- Auto scroll al final ---
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Marcar como leído al enfocar ventana ---
  useEffect(() => {
    const handleFocus = () => {
      const unread = messages.filter(
        (msg) => parseInt(msg.user_id) !== parseInt(user.id) && !msg.isRead
      );
      if (unread.length > 0) {
        socket.emit('mark_messages_read', {
          roomId: room.id,
          userId: user.id,
          messageIds: unread.map((m) => m.id),
        });
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [messages, room.id, user.id]);

  // --- Limpieza del timeout de escritura al desmontar ---
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const loadMessages = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/rooms/${room.id}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error('Error al cargar mensajes:', e);
    }
  };

  const handleNewMessage = (message) => {
    if (message.roomId !== room.id) return;

    setMessages((prev) => [...prev, message]);

    // Autoleído si está visible y es de otro usuario
    if (!document.hidden && parseInt(message.user_id) !== parseInt(user.id)) {
      setTimeout(() => {
        socket.emit('mark_messages_read', {
          roomId: room.id,
          userId: user.id,
          messageIds: [message.id],
        });
      }, 800);
    }
  };

  const handleUserTyping = ({ userId, username }) => {
    if (userId === user.id) return;
    setTypingUsers((prev) => new Set([...prev, username]));
  };

  const handleUserStopTyping = ({ userId, username }) => {
    if (userId === user.id) return;
    setTypingUsers((prev) => {
      const s = new Set(prev);
      s.delete(username);
      return s;
    });
  };

  const handleMessagesRead = ({ userId, messageIds }) => {
    if (userId === user.id) return;
    setMessages((prev) =>
      prev.map((msg) => (messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg))
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId: room.id, userId: user.id, username: user.username });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop_typing', { roomId: room.id, userId: user.id, username: user.username });
    }, 1000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('send_message', {
      roomId: room.id,
      userId: user.id,
      content: newMessage.trim(),
    });

    setNewMessage('');
    setIsTyping(false);
    socket.emit('stop_typing', { roomId: room.id, userId: user.id, username: user.username });
  };

  const handleKeyDown = (e) => {
    // Enviar con Enter; Shift+Enter = nueva línea
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
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

  const getSenderName = (message) => {
    if (parseInt(message.user_id) === parseInt(user.id)) return 'Tú';
    return message.display_name || message.username || 'Usuario';
  };

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

  const shouldShowSenderName = (message, index) => {
    if (parseInt(message.user_id) === parseInt(user.id)) return false;
    if (room.type === 'private') return false;
    if (index === 0) return true;
    const prev = messages[index - 1];
    return prev.user_id !== message.user_id;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* HEADER (sticky para móvil) */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-violet-900/90 backdrop-blur-xl border-b border-white/10 p-3 sm:p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <span className="text-lg sm:text-xl">{getRoomIcon()}</span>
              </div>
              {room.type === 'private' && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-gray-900 rounded-full shadow-lg" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base sm:text-lg truncate">{room.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {room.type === 'general' && (
                  <span className="flex items-center bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse" />
                    <span className="text-gray-300 text-xs">Sala General</span>
                  </span>
                )}
                {room.type === 'private' && (
                  <span className="flex items-center bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
                    <span className="text-gray-300 text-xs">Chat Privado</span>
                  </span>
                )}
                {room.type === 'group' && (
                  <span className="flex items-center bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1.5 animate-pulse" />
                    <span className="text-gray-300 text-xs">Grupo</span>
                  </span>
                )}
                <span className="text-gray-300/80 text-xs">• {messages.length} mensajes</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
            title="Cerrar chat"
            aria-label="Cerrar chat"
          >
            <div className="w-5 h-5 flex items-center justify-center font-bold">✕</div>
          </button>
        </div>
      </div>

      {/* MENSAJES (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2 bg-gradient-to-b from-gray-900/95 via-gray-800/95 to-gray-900/95 relative custom-scrollbar">
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
            const isOwn = parseInt(message.user_id) === parseInt(user.id);
            const showName = shouldShowSenderName(message, index);

            return (
              <div
                key={message.id || index}
                className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar visible en grupos o cuando cambia remitente */}
                {(room.type === 'group' || room.type === 'general' || showName) ? (
                  <div className={`flex-shrink-0 ${isOwn ? 'ml-2' : 'mr-2'}`}>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                        isOwn
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25'
                          : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/25'
                      }`}
                    >
                      {getAvatarInitial(message)}
                    </div>
                  </div>
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}

                <div
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1 min-w-0`}
                >
                  {/* Nombre del remitente en grupos */}
                  {showName && (
                    <div className="text-purple-300 text-[11px] sm:text-xs font-semibold mb-1 px-1 truncate max-w-[75vw] sm:max-w-[50vw]">
                      {getSenderName(message)}
                    </div>
                  )}

                  {/* Burbuja */}
                  <div
                    className={`relative px-3 py-2 rounded-xl shadow-lg backdrop-blur-sm break-words whitespace-pre-wrap leading-relaxed text-sm sm:text-[0.95rem] ${
                      isOwn
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-br-md'
                        : 'bg-gray-700/80 text-white rounded-bl-md border border-white/10'
                    } max-w-[85vw] sm:max-w-[70vw] md:max-w-[52vw] lg:max-w-[48vw] xl:max-w-[40vw]`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    <p>{message.content}</p>

                    <div
                      className={`text-[11px] sm:text-xs mt-1 flex justify-end ${
                        isOwn ? 'text-emerald-100' : 'text-gray-300'
                      }`}
                    >
                      <span>{formatTime(message.created_at)}</span>
                      {isOwn && <span className="ml-1">{message.read_count > 0 ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Indicador de escritura */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-gray-300 text-sm p-3 bg-gray-700/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg animate-pulse">
            <div className="flex gap-1 bg-purple-500/20 p-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="font-medium truncate">
              {Array.from(typingUsers).join(', ')}
              {typingUsers.size === 1 ? ' está escribiendo...' : ' están escribiendo...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT (sticky bottom con safe-area) */}
      <div
        className="sticky bottom-0 z-10 bg-gradient-to-r from-gray-800/95 via-gray-800/90 to-gray-800/95 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <form onSubmit={handleSendMessage}>
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative min-w-0">
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                rows={1}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/60 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all duration-200 text-sm shadow-lg resize-none"
                maxLength={500}
                aria-label="Escribir mensaje"
              />
              <div className="absolute bottom-2 right-2 text-[11px] sm:text-xs text-gray-400 font-medium bg-gray-800/60 px-2 py-0.5 rounded-full">
                {newMessage.length}/500
              </div>
            </div>

            <button
              type="submit"
              className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold transition-all duration-200 shadow-lg ${
                newMessage.trim()
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white active:scale-[0.98]'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!newMessage.trim()}
              aria-label="Enviar mensaje"
              title="Enviar"
            >
              <span className="inline-block w-5 text-center">
                {newMessage.trim() ? '🚀' : '➤'}
              </span>
            </button>
          </div>
        </form>

        {/* Estado */}
        <div className="flex items-center justify-between mt-2 text-[11px] sm:text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span>Conectado</span>
            </span>
            <span>{messages.length} mensajes</span>
          </div>
          <span className="text-gray-500">
            {room.type === 'private' ? 'Cifrado extremo a extremo' : 'Mensajes públicos'}
          </span>
        </div>
      </div>

      {/* Scrollbar estética */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}

export default ChatWindow;
