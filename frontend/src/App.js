import React, { useState, useEffect } from 'react';
import socket, { SOCKET_URL } from './socket';
import Login from './components/Login';
import Register from './components/Register';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import FriendRequests from './components/FriendRequests';
import CreateGroup from './components/CreateGroup';
import useNotifications from './hooks/useNotifications';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState(new Set());
  const [activeSection, setActiveSection] = useState('chats');
  const { permission, requestPermission, isSupported } = useNotifications();

  // Cargar usuario guardado al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData && userData.id && userData.username) {
          setUser(userData);
        } else {
          localStorage.removeItem('chatUser');
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  // Manejar conexión del socket
  useEffect(() => {
    if (user) {
      localStorage.setItem('chatUser', JSON.stringify(user));

      socket.connect();
      socket.emit('user_connected', user.id);

      socket.on('connect', () => {
        console.log('Conectado al servidor');
        socket.emit('user_connected', user.id);
      });

      socket.on('disconnect', () => {
        console.log('Desconectado del servidor');
      });

      socket.on('connect_error', (error) => {
        console.error('Error de conexión:', error);
      });

      loadRooms();
      loadFriends();
      loadPendingRequests();

      // Listeners de socket
      socket.on('friend_request', () => {
        loadPendingRequests();
      });

      socket.on('friend_online', ({ userId }) => {
        setOnlineFriends((prev) => new Set([...prev, userId]));
      });

      socket.on('friend_offline', ({ userId }) => {
        setOnlineFriends((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      socket.on('private_chat_created', ({ roomId }) => {
        if (!rooms.find((room) => room.id === roomId)) {
          loadRooms();
        }
        selectRoom(roomId);
      });

      socket.on('private_chat_notification', ({ roomId }) => {
        if (!rooms.find((room) => room.id === roomId)) {
          loadRooms();
        }
      });

      socket.on('added_to_group', () => {
        loadRooms();
      });

      socket.on('group_created', ({ id }) => {
        if (!rooms.find((room) => room.id === id)) {
          loadRooms();
        }
        selectRoom(id);
      });

      return () => {
        socket.off('friend_request');
        socket.off('friend_online');
        socket.off('friend_offline');
        socket.off('private_chat_created');
        socket.off('private_chat_notification');
        socket.off('added_to_group');
        socket.off('group_created');
      };
    } else {
      socket.disconnect();
    }
  }, [user]);

  const loadRooms = async () => {
    try {
      const [generalRes, userRoomsRes] = await Promise.all([
        fetch(`${SOCKET_URL}/api/rooms/general`),
        fetch(`${SOCKET_URL}/api/rooms/user/${user.id}`),
      ]);

      const general = await generalRes.json();
      const userRooms = await userRoomsRes.json();

      const allRooms = [...general, ...userRooms];
      const uniqueRooms = allRooms.filter(
        (room, index, self) => index === self.findIndex((r) => r.id === room.id)
      );

      setRooms(uniqueRooms);
    } catch (error) {
      console.error('Error al cargar salas:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/friends/${user.id}`);
      const data = await response.json();
      setFriends(data);
    } catch (error) {
      console.error('Error al cargar amigos:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/friends/requests/${user.id}`);
      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
    }
  };

  const selectRoom = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      if (selectedRoom?.id) {
        socket.emit('leave_room', { roomId: selectedRoom.id });
      }
      socket.emit('join_room', { roomId, userId: user.id });
      setSelectedRoom(room);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatUser');
    socket.disconnect();
    setUser(null);
    setSelectedRoom(null);
    setRooms([]);
    setFriends([]);
    setPendingRequests([]);
    setOnlineFriends(new Set());
  };

  const handleStartPrivateChat = async (friendId) => {
    socket.emit('start_private_chat', { userId: user.id, friendId });
  };

  const handleCreateGroup = async (groupName, selectedFriends) => {
    socket.emit('create_group', {
      name: groupName,
      createdBy: user.id,
      members: selectedFriends,
    });
    setShowCreateGroup(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Efectos de fondo animados */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-500"></div>

        {/* Patrón de fondo sutil */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-4 h-4 bg-white rounded-full animate-bounce"></div>
          <div className="absolute top-40 right-32 w-3 h-3 bg-cyan-300 rounded-full animate-bounce delay-300"></div>
          <div className="absolute bottom-32 left-1/3 w-2 h-2 bg-purple-300 rounded-full animate-bounce delay-700"></div>
        </div>

        {showRegister ? (
          <Register onRegister={handleRegister} onBack={() => setShowRegister(false)} />
        ) : (
          <Login onLogin={handleLogin} onShowRegister={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex overflow-hidden relative">
      {/* Efectos de fondo para la app principal */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4UzAgOC4wNiAwIDE4czguMDYgMTggMTggMThoMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

      {/* Sidebar Mejorado */}
      <div className="w-80 bg-gray-800/80 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl relative z-10">
        {/* Header Premium */}
        <div className="p-6 bg-gradient-to-r from-purple-600/90 via-indigo-600/90 to-violet-600/90 backdrop-blur-md border-b border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {user.displayName?.charAt(0).toUpperCase() ||
                    user.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  {user.displayName}
                </h2>
                <p className="text-purple-200 text-sm font-medium">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-105 backdrop-blur-sm border border-white/20"
            >
              🚪 Salir
            </button>
          </div>
        </div>

        {/* Navegación por Secciones */}
        <div className="p-4 border-b border-white/10 bg-gray-750/50 backdrop-blur-sm">
          <div className="flex space-x-1 bg-gray-700/50 rounded-xl p-1">
            {[
              { id: 'chats', label: '💬 Chats', icon: '💬' },
              { id: 'friends', label: '👥 Amigos', icon: '👥' },
              { id: 'groups', label: '👪 Grupos', icon: '👪' },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botones de Acción Mejorados */}
        <div className="p-4 space-y-3 border-b border-white/10 bg-gray-750/30 backdrop-blur-sm">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-purple-500/25 flex items-center justify-center space-x-2"
          >
            <span className="text-lg">🛠️</span>
            <span>Crear Grupo</span>
          </button>

          <button
            onClick={() => setShowFriendRequests(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center space-x-2 relative"
          >
            <span className="text-lg">👥</span>
            <span>Solicitudes</span>
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          {/* Botón de notificaciones mejorado */}
          {isSupported && permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-amber-500/25 flex items-center justify-center space-x-2"
            >
              <span className="text-lg">🔔</span>
              <span>Notificaciones</span>
            </button>
          )}
        </div>

        {/* Lista de Chats/Amigos */}
        <div className="flex-1 overflow-hidden">
          <ChatList
            rooms={rooms}
            friends={friends}
            selectedRoom={selectedRoom}
            onSelectRoom={selectRoom}
            onStartPrivateChat={handleStartPrivateChat}
            onlineFriends={onlineFriends}
            activeSection={activeSection}
          />
        </div>

        {/* Footer con información del usuario */}
        <div className="p-4 bg-gray-800/80 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Conectado</span>
            </div>
            <span>{rooms.length} salas</span>
          </div>
        </div>
      </div>

      {/* Área Principal de Chat */}
      <div className="flex-1 flex flex-col relative">
        {selectedRoom ? (
          <ChatWindow room={selectedRoom} user={user} onClose={() => setSelectedRoom(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
            {/* Efectos de fondo para pantalla de bienvenida */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-indigo-900/10"></div>

            <div className="text-center backdrop-blur-sm bg-white/5 rounded-3xl p-12 border border-white/10 shadow-2xl max-w-md mx-4">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-4xl">💬</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Bienvenido a NeoChat
              </h2>
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                Selecciona una conversación o inicia un chat con tus amigos para comenzar
              </p>
              <div className="flex justify-center space-x-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <span className="text-xl">👥</span>
                  </div>
                  <p className="text-gray-400 text-sm">Chats Privados</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <span className="text-xl">👪</span>
                  </div>
                  <p className="text-gray-400 text-sm">Grupos</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <span className="text-xl">🌐</span>
                  </div>
                  <p className="text-gray-400 text-sm">General</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showFriendRequests && (
        <FriendRequests
          userId={user.id}
          pendingRequests={pendingRequests}
          onClose={() => {
            setShowFriendRequests(false);
            loadPendingRequests();
            loadFriends();
          }}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          friends={friends}
          onCreateGroup={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  );
}

export default App;
