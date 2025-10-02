import React, { useState, useEffect } from 'react';
import { LogOut, MessageCircle, Users, UsersRound, Settings, Bell, Globe, Menu, X } from 'lucide-react';
import socket, { SOCKET_URL } from './socket';
import Login from './components/Login';
import Register from './components/Register';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import FriendRequests from './components/FriendRequests';
import CreateGroup from './components/CreateGroup';

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

  // NUEVO: sidebar móvil (drawer)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);


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

      socket.on('friend_request', () => loadPendingRequests());
      socket.on('friend_online', ({ userId }) => {
        setOnlineFriends((prev) => new Set([...prev, userId]));
      });
      socket.on('friend_offline', ({ userId }) => {
        setOnlineFriends((prev) => {
          const s = new Set(prev);
          s.delete(userId);
          return s;
        });
      });

      socket.on('private_chat_created', ({ roomId }) => {
        if (!rooms.find((room) => room.id === roomId)) loadRooms();
        selectRoom(roomId);
      });

      socket.on('private_chat_notification', ({ roomId }) => {
        if (!rooms.find((room) => room.id === roomId)) loadRooms();
      });

      socket.on('added_to_group', () => loadRooms());
      socket.on('group_created', ({ id }) => {
        if (!rooms.find((room) => room.id === id)) loadRooms();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Cerrar el drawer en móvil al entrar a una sala
      setMobileSidebarOpen(false);
    }
  };

  const handleLogin = (userData) => setUser(userData);
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
    socket.emit('create_group', { name: groupName, createdBy: user.id, members: selectedFriends });
    setShowCreateGroup(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        {showRegister ? (
          <Register onRegister={handleRegister} onBack={() => setShowRegister(false)} />
        ) : (
          <Login onLogin={handleLogin} onShowRegister={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  const SidebarContent = (
    <div className="h-full bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-slate-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold">
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-white font-bold truncate max-w-[12rem]">{user.displayName}</h2>
              <p className="text-gray-400 text-sm truncate max-w-[12rem]">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Navegación */}
      <div className="p-3 sm:p-4 border-b border-gray-700">
        <div className="flex space-x-1 bg-gray-700/50 rounded-lg p-1">
          {[
            { id: 'chats', label: 'Chats', icon: MessageCircle },
            { id: 'friends', label: 'Amigos', icon: Users },
            { id: 'groups', label: 'Grupos', icon: UsersRound },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <section.icon size={16} />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="p-3 sm:p-4 space-y-2 border-b border-gray-700">
        <button
          onClick={() => setShowCreateGroup(true)}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors flex items-center justify-center space-x-2 shadow-md"
        >
          <Settings size={18} />
          <span>Crear Grupo</span>
        </button>

        <button
          onClick={() => setShowFriendRequests(true)}
          className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-700 rounded-md text-white font-medium transition-colors flex items-center justify-center space-x-2 relative shadow-md"
        >
          <Users size={18} />
          <span>Solicitudes</span>
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>

     
      </div>

      {/* Lista */}
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

      {/* Footer */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Conectado</span>
          </div>
          <span>{rooms.length} salas</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 h-[100dvh] h-[100vh] md:h-screen flex flex-col">
      {/* APP BAR (solo móvil) */}
      <header className="md:hidden flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/90 backdrop-blur">
        <div className="flex items-center space-x-2">
          <button
            aria-label="Abrir menú"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-white text-sm font-semibold truncate max-w-[9rem]">{user.displayName || 'Usuario'}</p>
              <p className="text-gray-400 text-xs truncate max-w-[9rem]">@{user.username}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
          aria-label="Salir"
          title="Salir"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* CONTENIDO */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* SIDEBAR ESCRITORIO */}
        <aside className="hidden md:flex w-80 border-r border-gray-800 shadow-xl">
          {SidebarContent}
        </aside>

        {/* DRAWER MÓVIL */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Cerrar menú"
            />
            {/* Panel */}
            <div className="absolute left-0 top-0 h-full w-[80%] max-w-[320px] bg-gray-800 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Menú</h3>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
                  aria-label="Cerrar menú"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="h-[calc(100%-56px)] overflow-y-auto">
                {SidebarContent}
              </div>
            </div>
          </div>
        )}

        {/* ÁREA PRINCIPAL */}
        <main className="flex-1 flex flex-col min-w-0">
          {selectedRoom ? (
            <ChatWindow
              room={selectedRoom}
              user={user}
              onClose={() => setSelectedRoom(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900 overflow-auto">
              <div className="text-center bg-gray-800 rounded-lg p-8 sm:p-12 border border-gray-700 shadow-xl max-w-md mx-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle size={34} className="text-white sm:hidden" />
                  <MessageCircle size={40} className="text-white hidden sm:block" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                  Bienvenido a ChatApp
                </h2>
                <p className="text-gray-400 mb-6 text-sm sm:text-base">
                  Selecciona una conversación o inicia un chat con tus amigos para comenzar.
                </p>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-600 rounded-md flex items-center justify-center mx-auto mb-2">
                      <Users size={20} className="text-white" />
                    </div>
                    <p className="text-gray-400 text-xs">Chats Privados</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-600 rounded-md flex items-center justify-center mx-auto mb-2">
                      <UsersRound size={20} className="text-white" />
                    </div>
                    <p className="text-gray-400 text-xs">Grupos</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-600 rounded-md flex items-center justify-center mx-auto mb-2">
                      <Globe size={20} className="text-white" />
                    </div>
                    <p className="text-gray-400 text-xs">General</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* TABS INFERIORES (solo móvil) */}
      <nav className="md:hidden border-t border-gray-800 bg-gray-900">
        <div className="grid grid-cols-3">
          {[
            { id: 'chats', label: 'Chats', icon: MessageCircle },
            { id: 'friends', label: 'Amigos', icon: Users },
            { id: 'groups', label: 'Grupos', icon: UsersRound },
          ].map((tab) => {
            const active = activeSection === (tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex flex-col items-center justify-center py-2.5 text-xs ${
                  active ? 'text-blue-500' : 'text-gray-400'
                }`}
                aria-label={tab.label}
              >
                <tab.icon size={18} />
                <span className="mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
