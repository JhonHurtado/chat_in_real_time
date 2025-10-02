import React, { useState } from 'react';
import { SOCKET_URL } from '../socket';

function ChatList({ rooms, friends, selectedRoom, onSelectRoom, onStartPrivateChat, onlineFriends, activeSection }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.trim().length > 0) {
      try {
        const response = await fetch(`${SOCKET_URL}/api/users/search?q=${encodeURIComponent(term)}`);
        const data = await response.json();
        setSearchResults(data);
        setShowSearch(true);
      } catch (error) {
        console.error('Error en búsqueda:', error);
      }
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const handleSendFriendRequest = async (friendId) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const response = await fetch(`${SOCKET_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, friendId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ ' + data.message);
        setSearchTerm('');
        setShowSearch(false);
      } else {
        const errorMessage = data.error || 'Error desconocido al enviar solicitud';
        alert('❌ ' + errorMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al enviar solicitud');
    }
  };

  const getRoomIcon = (room) => {
    if (room.type === 'general') return '🌐';
    if (room.type === 'private') return '👥';
    if (room.type === 'group') return '👪';
    return '💬';
  };

  const getRoomGradient = (room) => {
    if (room.type === 'general') return 'from-blue-500 to-cyan-500';
    if (room.type === 'private') return 'from-green-500 to-emerald-500';
    if (room.type === 'group') return 'from-purple-500 to-indigo-500';
    return 'from-gray-500 to-gray-600';
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const filteredRooms = rooms.filter(room => {
    if (activeSection === 'chats') return room.type === 'private';
    if (activeSection === 'groups') return room.type === 'group';
    return true; // 'all' or other sections
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
      {/* Barra de Búsqueda Mejorada */}
      <div className="p-4 border-b border-white/10 bg-gray-750/30 backdrop-blur-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-lg">🔍</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={
              activeSection === 'chats' ? 'Buscar conversaciones...' : 
              activeSection === 'friends' ? 'Buscar amigos o usuarios...' : 
              'Buscar grupos...'
            }
            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/30 transition-all duration-300 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSearch(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Resultados de Búsqueda Mejorados */}
      {showSearch && activeSection === 'friends' && (
        <div className="px-4 pb-4 border-b border-white/10">
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <div className="p-3 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-b border-white/10">
              <p className="text-white font-semibold text-sm">Resultados de búsqueda</p>
            </div>
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-b-0 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                      {user.display_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold group-hover:text-cyan-100 transition-colors">
                        {user.display_name}
                      </p>
                      <p className="text-gray-400 text-sm">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendFriendRequest(user.id)}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg text-white text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25"
                  >
                    Agregar
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-gray-400 text-sm">No se encontraron usuarios</p>
                <p className="text-gray-500 text-xs mt-1">Intenta con otro nombre de usuario</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Encabezado de Sección */}
        <div className="p-4 pb-2">
          <h3 className="text-white font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {activeSection === 'chats' && '💬 Conversaciones Privadas'}
            {activeSection === 'friends' && '👥 Lista de Amigos'}
            {activeSection === 'groups' && '👪 Grupos de Chat'}
          </h3>
          <p className="text-gray-400 text-xs mt-1">
            {activeSection === 'chats' && `${filteredRooms.length} conversaciones`}
            {activeSection === 'friends' && `${friends.length} amigos · ${Array.from(onlineFriends).length} en línea`}
            {activeSection === 'groups' && `${filteredRooms.length} grupos activos`}
          </p>
        </div>

        {/* Lista de Chats/Amigos/Grupos */}
        <div className="space-y-2 p-2">
          {activeSection === 'friends' ? (
            /* LISTA DE AMIGOS */
            friends.length > 0 ? (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => onStartPrivateChat(friend.id)}
                  className="w-full p-4 rounded-2xl text-left transition-all duration-300 group hover:bg-white/5 backdrop-blur-sm border border-transparent hover:border-white/10 bg-gray-750/30 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${
                        getStatusColor(onlineFriends.has(friend.id))
                      }`}>
                        {friend.display_name?.charAt(0).toUpperCase() || friend.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-gray-800 rounded-full shadow-lg ${
                        onlineFriends.has(friend.id) 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse' 
                          : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-semibold truncate group-hover:text-cyan-100 transition-colors">
                          {friend.display_name}
                        </p>
                        {onlineFriends.has(friend.id) && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                            En línea
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">@{friend.username}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm">
                        💬
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">👥</span>
                </div>
                <p className="text-gray-400 text-lg font-semibold mb-2">
                  Aún no tienes amigos
                </p>
                <p className="text-gray-500 text-sm">
                  Busca usuarios arriba y envía solicitudes de amistad
                </p>
              </div>
            )
          ) : (
            /* LISTA DE CHATS/GRUPOS */
            filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full p-4 rounded-2xl text-left transition-all duration-300 group backdrop-blur-sm border shadow-lg ${
                    selectedRoom?.id === room.id
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/30 shadow-purple-500/25 transform scale-[1.02]'
                      : 'bg-gray-750/30 border-white/5 hover:border-white/10 hover:bg-white/5 hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg bg-gradient-to-br ${getRoomGradient(room)}`}>
                        {getRoomIcon(room)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-white font-semibold truncate group-hover:text-purple-100 transition-colors">
                            {room.name}
                          </p>
                          {room.message_count > 0 && (
                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                              {room.message_count}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm capitalize">
                          {room.type === 'general' && 'Sala General • Todos pueden unirse'}
                          {room.type === 'private' && 'Chat Privado • Conversación segura'}
                          {room.type === 'group' && `Grupo • ${room.member_count || 0} miembros`}
                        </p>
                      </div>
                    </div>
                    <div className={`opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                      selectedRoom?.id === room.id ? 'opacity-100' : ''
                    }`}>
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                        →
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 px-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">
                    {activeSection === 'chats' ? '💬' : '👪'}
                  </span>
                </div>
                <p className="text-gray-400 text-lg font-semibold mb-2">
                  {activeSection === 'chats' ? 'No hay conversaciones' : 'No hay grupos'}
                </p>
                <p className="text-gray-500 text-sm">
                  {activeSection === 'chats' 
                    ? 'Inicia una conversación con tus amigos' 
                    : 'Crea un nuevo grupo para comenzar'
                  }
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Efectos de Estilo */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8B5CF6, #6366F1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7C3AED, #4F46E5);
        }
      `}</style>
    </div>
  );
}

export default ChatList;