import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('user_connected', user.id);

      loadRooms();
      loadFriends();
      loadPendingRequests();

      // Listeners de socket
      socket.on('friend_request', () => {
        loadPendingRequests();
      });

      socket.on('friend_online', ({ userId }) => {
        setOnlineFriends(prev => new Set([...prev, userId]));
      });

      socket.on('friend_offline', ({ userId }) => {
        setOnlineFriends(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      socket.on('private_chat_created', ({ roomId }) => {
        loadRooms();
        selectRoom(roomId);
      });

      socket.on('private_chat_notification', ({ roomId }) => {
        loadRooms();
      });

      socket.on('added_to_group', () => {
        loadRooms();
      });

      socket.on('group_created', ({ id }) => {
        loadRooms();
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
        fetch(`${SOCKET_URL}/api/rooms/user/${user.id}`)
      ]);

      const general = await generalRes.json();
      const userRooms = await userRoomsRes.json();

      setRooms([...general, ...userRooms]);
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
    const room = rooms.find(r => r.id === roomId);
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
    socket.disconnect();
    setUser(null);
    setSelectedRoom(null);
    setRooms([]);
    setFriends([]);
  };

  const handleStartPrivateChat = async (friendId) => {
    socket.emit('start_private_chat', { userId: user.id, friendId });
  };

  const handleCreateGroup = async (groupName, selectedFriends) => {
    socket.emit('create_group', {
      name: groupName,
      createdBy: user.id,
      members: selectedFriends
    });
    setShowCreateGroup(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM0YzFkOTUiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4UzAgOC4wNiAwIDE4czguMDYgMTggMTggMThoMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        
        {showRegister ? (
          <Register 
            onRegister={handleRegister} 
            onBack={() => setShowRegister(false)} 
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onShowRegister={() => setShowRegister(true)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{user.displayName}</h2>
              <p className="text-purple-200 text-sm">@{user.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2 border-b border-gray-700">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
          >
            ➕ Crear Grupo
          </button>
          <button
            onClick={() => setShowFriendRequests(true)}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors relative"
          >
            👥 Solicitudes
            {pendingRequests.length > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Chat List */}
        <ChatList
          rooms={rooms}
          friends={friends}
          selectedRoom={selectedRoom}
          onSelectRoom={selectRoom}
          onStartPrivateChat={handleStartPrivateChat}
          onlineFriends={onlineFriends}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatWindow
            room={selectedRoom}
            user={user}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Bienvenido a Chat en Tiempo Real
              </h2>
              <p className="text-gray-400">
                Selecciona una sala o inicia un chat con tus amigos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
