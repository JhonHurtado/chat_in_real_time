import React, { useState } from 'react';
import { SOCKET_URL } from '../socket';

function ChatList({ rooms, friends, selectedRoom, onSelectRoom, onStartPrivateChat, onlineFriends }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'friends'

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
      const userId = JSON.parse(localStorage.getItem('user'))?.id;
      const response = await fetch(`${SOCKET_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, friendId }),
      });

      if (response.ok) {
        alert('Solicitud enviada');
        setSearchTerm('');
        setShowSearch(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Error al enviar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar solicitud');
    }
  };

  const getRoomIcon = (room) => {
    if (room.type === 'general') return '🌐';
    if (room.type === 'private') return '👥';
    if (room.type === 'group') return '👪';
    return '💬';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chats'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          💬 Chats
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'friends'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          👥 Amigos
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={activeTab === 'chats' ? 'Buscar chats...' : 'Buscar usuarios...'}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Search Results */}
      {showSearch && activeTab === 'friends' && (
        <div className="px-4 pb-4">
          <div className="bg-gray-700 rounded-lg overflow-hidden">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3 hover:bg-gray-600 flex items-center justify-between border-b border-gray-600 last:border-b-0"
                >
                  <div>
                    <p className="text-white font-medium">{user.display_name}</p>
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => handleSendFriendRequest(user.id)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              ))
            ) : (
              <p className="p-4 text-gray-400 text-center text-sm">No se encontraron usuarios</p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <div className="space-y-1 p-2">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedRoom?.id === room.id
                      ? 'bg-purple-600 shadow-lg'
                      : 'hover:bg-gray-700 bg-gray-750'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{getRoomIcon(room)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{room.name}</p>
                        <p className="text-gray-400 text-xs">
                          {room.type === 'general' && 'Sala General'}
                          {room.type === 'private' && 'Chat Privado'}
                          {room.type === 'group' && 'Grupo'}
                        </p>
                      </div>
                    </div>
                    {room.message_count > 0 && (
                      <span className="ml-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                        {room.message_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8 text-sm">
                No hay chats aún
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {friends.length > 0 ? (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => onStartPrivateChat(friend.id)}
                  className="w-full p-3 rounded-lg text-left hover:bg-gray-700 bg-gray-750 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {friend.display_name.charAt(0).toUpperCase()}
                      </div>
                      {onlineFriends.has(friend.id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{friend.display_name}</p>
                      <p className="text-gray-400 text-xs truncate">@{friend.username}</p>
                    </div>
                    {onlineFriends.has(friend.id) && (
                      <span className="text-green-500 text-xs">• En línea</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">
                  Aún no tienes amigos
                </p>
                <p className="text-gray-500 text-xs">
                  Busca usuarios y envía solicitudes de amistad
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatList;