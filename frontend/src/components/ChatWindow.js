import React, { useState, useEffect, useRef } from 'react';
import socket, { SOCKET_URL } from '../socket';

function ChatWindow({ room, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadMessages();

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [room.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    }
  };

  const handleUserTyping = ({ userId, username }) => {
    if (userId !== user.id) {
      setTypingUsers((prev) => new Set([...prev, username]));
    }
  };

  const handleUserStopTyping = ({ userId }) => {
    if (userId !== user.id) {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
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
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoomIcon = () => {
    if (room.type === 'general') return '🌐';
    if (room.type === 'private') return '👥';
    if (room.type === 'group') return '👪';
    return '💬';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{getRoomIcon()}</span>
          <div>
            <h2 className="text-white font-bold text-lg">{room.name}</h2>
            <p className="text-gray-400 text-sm">
              {room.type === 'general' && 'Sala General • Todos pueden participar'}
              {room.type === 'private' && 'Chat Privado'}
              {room.type === 'group' && 'Grupo'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No hay mensajes aún</p>
              <p className="text-gray-500 text-sm">Sé el primero en enviar un mensaje</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.user_id === user.id;
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;

            return (
              <div
                key={message.id || index}
                className={`flex items-end space-x-2 animate-slide-in ${
                  isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {showAvatar && !isOwnMessage && (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {message.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {!showAvatar && !isOwnMessage && <div className="w-8"></div>}

                <div
                  className={`max-w-md px-4 py-2 rounded-2xl ${
                    isOwnMessage
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {showAvatar && !isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 text-purple-300">
                      {message.display_name || message.username}
                    </p>
                  )}
                  <p className="break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-purple-200' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>{Array.from(typingUsers).join(', ')} está escribiendo...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg text-white font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={!newMessage.trim()}
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;