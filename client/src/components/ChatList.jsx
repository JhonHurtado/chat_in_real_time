import React, { useState } from 'react';
import {
  Search,
  X,
  Globe,
  Users,
  UsersRound,
  MessageCircle,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import { SOCKET_URL } from '../socket';



function ChatList({
  rooms,
  friends,
  selectedRoom,
  onSelectRoom,
  onStartPrivateChat,
  onlineFriends,
  activeSection,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async (term) => {
    setSearchTerm(term);

    if (term.trim().length > 0) {
      try {
        const response = await fetch(
          `${SOCKET_URL}/api/users/search?q=${encodeURIComponent(term)}`
        );
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
      const userRaw = localStorage.getItem('chatUser');
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (!user || !user.id) {
        alert('Error: Usuario no autenticado');
        return;
      }

      const response = await fetch(`${SOCKET_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✓ ' + data.message);
        setSearchTerm('');
        setShowSearch(false);
      } else {
        const errorMessage = data.error || 'Error desconocido al enviar solicitud';
        alert('✗ ' + errorMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('✗ Error de conexión al enviar solicitud');
    }
  };

  const getRoomIcon = (room) => {
    if (room.type === 'general') return Globe;
    if (room.type === 'private') return Users;
    if (room.type === 'group') return UsersRound;
    return MessageCircle;
  };

  const getRoomGradient = (room) => {
    if (room.type === 'general') return 'from-blue-600 to-blue-700';
    if (room.type === 'private') return 'from-slate-600 to-slate-700';
    if (room.type === 'group') return 'from-gray-600 to-gray-700';
    return 'from-gray-500 to-gray-600';
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'bg-slate-600' : 'bg-gray-600';
  };

  const filteredRooms = rooms.filter((room) => {
    if (activeSection === 'chats') return room.type === 'private';
    if (activeSection === 'groups') return room.type === 'group';
    return true; // friends no usa rooms
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
      {/* BARRA DE BÚSQUEDA (sticky en móvil/tablet) */}
      <div className="sticky top-0 z-10 p-3 sm:p-4 border-b border-white/10 bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-gray-800/50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={
              activeSection === 'chats'
                ? 'Buscar conversaciones...'
                : activeSection === 'friends'
                ? 'Buscar amigos o usuarios...'
                : 'Buscar grupos...'
            }
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600/30 transition-all duration-200 text-sm sm:text-[0.95rem]"
            aria-label="Buscar"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setShowSearch(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* RESULTADOS DE BÚSQUEDA (sólo en sección friends) */}
      {showSearch && activeSection === 'friends' && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-b border-white/10">
          <div className="bg-gray-700/40 rounded-lg overflow-hidden border border-gray-600/40 shadow-lg">
            <div className="p-2.5 sm:p-3 bg-gray-800/60 border-b border-gray-600/40">
              <p className="text-white font-semibold text-sm">Resultados de búsqueda</p>
            </div>

            {searchResults.length > 0 ? (
              <ul role="list" className="divide-y divide-white/5">
                {searchResults.map((user) => (
                  <li key={user.id} className="px-3 sm:px-4 py-3 sm:py-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-md shrink-0">
                        {user.display_name?.charAt(0).toUpperCase() ||
                          user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm sm:text-[0.95rem] truncate">
                          {user.display_name}
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">@{user.username}</p>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => handleSendFriendRequest(user.id)}
                          className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1.5 shadow-md"
                        >
                          <UserPlus size={16} />
                          <span className="hidden xs:inline">Agregar</span>
                          <span className="xs:hidden">+</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">No se encontraron usuarios</p>
                <p className="text-gray-500 text-xs mt-1">Intenta con otro nombre de usuario</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Encabezado de Sección */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
            {activeSection === 'chats' && (
              <>
                <MessageCircle size={18} />
                <span>Conversaciones Privadas</span>
              </>
            )}
            {activeSection === 'friends' && (
              <>
                <Users size={18} />
                <span>Lista de Amigos</span>
              </>
            )}
            {activeSection === 'groups' && (
              <>
                <UsersRound size={18} />
                <span>Grupos de Chat</span>
              </>
            )}
          </h3>
          <p
            className="text-gray-400 text-[11px] sm:text-xs mt-1"
            aria-live="polite"
          >
            {activeSection === 'chats' && `${filteredRooms.length} conversaciones`}
            {activeSection === 'friends' &&
              `${friends.length} amigos · ${Array.from(onlineFriends).length} en línea`}
            {activeSection === 'groups' && `${filteredRooms.length} grupos activos`}
          </p>
        </div>

        {/* LISTADOS */}
        <div className="p-2 sm:p-3">
          {activeSection === 'friends' ? (
            friends.length > 0 ? (
              /**
               * Responsive layout:
               * - Móvil: lista (1 columna)
               * - md+: grid 2 columnas (tarjetas más anchas)
               */
              <ul
                role="list"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2 sm:gap-3"
              >
                {friends.map((friend) => (
                  <li key={friend.id}>
                    <button
                      onClick={() => onStartPrivateChat(friend.id)}
                      className="w-full p-3 sm:p-4 rounded-lg text-left transition-colors group hover:bg-gray-700/50 bg-gray-800/30 border border-transparent hover:border-gray-600/50 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-white font-semibold shadow-md ${getStatusColor(
                              onlineFriends.has(friend.id)
                            )}`}
                          >
                            {friend.display_name?.charAt(0).toUpperCase() ||
                              friend.username?.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-gray-800 rounded-full ${
                              onlineFriends.has(friend.id)
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                            }`}
                            aria-label={
                              onlineFriends.has(friend.id) ? 'En línea' : 'Desconectado'
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold truncate group-hover:text-blue-300 transition-colors text-sm sm:text-[0.95rem]">
                              {friend.display_name}
                            </p>
                            {onlineFriends.has(friend.id) && (
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] sm:text-xs rounded border border-green-500/30 shrink-0">
                                En línea
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-[11px] sm:text-xs truncate">
                            @{friend.username}
                          </p>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                          <ChevronRight size={18} className="text-gray-400" />
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 sm:py-12 px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Users size={28} className="text-gray-400 sm:hidden" />
                  <Users size={32} className="text-gray-400 hidden sm:block" />
                </div>
                <p className="text-gray-400 text-sm sm:text-base font-semibold mb-1 sm:mb-2">
                  Aún no tienes amigos
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Busca usuarios arriba y envía solicitudes de amistad
                </p>
              </div>
            )
          ) : filteredRooms.length > 0 ? (
            <ul role="list" className="space-y-2 sm:space-y-3">
              {filteredRooms.map((room) => {
                const RoomIcon = getRoomIcon(room);
                const selected = selectedRoom?.id === room.id;

                return (
                  <li key={room.id}>
                    <button
                      onClick={() => onSelectRoom(room.id)}
                      className={`w-full p-3 sm:p-4 rounded-lg text-left transition-colors group border shadow-sm ${
                        selected
                          ? 'bg-blue-600/20 border-blue-600/50 shadow-blue-600/10'
                          : 'bg-gray-800/30 border-transparent hover:border-gray-600/50 hover:bg-gray-700/50'
                      }`}
                      aria-current={selected ? 'true' : 'false'}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-white shadow-md bg-gradient-to-br ${getRoomGradient(
                              room
                            )} shrink-0`}
                          >
                            <RoomIcon size={18} className="sm:hidden" />
                            <RoomIcon size={20} className="hidden sm:block" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white font-semibold truncate group-hover:text-blue-300 transition-colors text-sm sm:text-[0.95rem]">
                                {room.name}
                              </p>

                              {!!room.message_count && (
                                <span className="bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  {room.message_count}
                                </span>
                              )}
                            </div>

                            <p className="text-gray-400 text-[11px] sm:text-xs truncate">
                              {room.type === 'general' && 'Sala General • Acceso público'}
                              {room.type === 'private' && 'Chat Privado • Cifrado'}
                              {room.type === 'group' &&
                                `Grupo • ${room.member_count || 0} miembros`}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`transition-opacity duration-200 shrink-0 ${
                            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <ChevronRight size={18} className="text-gray-400" />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-10 sm:py-12 px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                {activeSection === 'chats' ? (
                  <>
                    <MessageCircle size={28} className="text-gray-400 sm:hidden" />
                    <MessageCircle size={32} className="text-gray-400 hidden sm:block" />
                  </>
                ) : (
                  <>
                    <UsersRound size={28} className="text-gray-400 sm:hidden" />
                    <UsersRound size={32} className="text-gray-400 hidden sm:block" />
                  </>
                )}
              </div>
              <p className="text-gray-400 text-sm sm:text-base font-semibold mb-1 sm:mb-2">
                {activeSection === 'chats' ? 'No hay conversaciones' : 'No hay grupos'}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm">
                {activeSection === 'chats'
                  ? 'Inicia una conversación con tus amigos'
                  : 'Crea un nuevo grupo para comenzar'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ESTILOS DEL SCROLL */}
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

export default ChatList;
