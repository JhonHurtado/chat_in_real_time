import React, { useState } from 'react';

function CreateGroup({ friends, onCreateGroup, onClose }) {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [error, setError] = useState('');

  const handleToggleFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!groupName.trim()) {
      setError('El nombre del grupo es requerido');
      return;
    }

    if (selectedFriends.length === 0) {
      setError('Debes seleccionar al menos un amigo');
      return;
    }

    onCreateGroup(groupName.trim(), selectedFriends);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">👪</span>
              Crear Grupo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Grupo
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: Amigos del trabajo"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Friends Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Selecciona Amigos ({selectedFriends.length} seleccionados)
            </label>
            
            {friends.length === 0 ? (
              <div className="bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-400">No tienes amigos para agregar</p>
                <p className="text-gray-500 text-sm mt-1">
                  Agrega amigos primero para crear grupos
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {friends.map((friend) => (
                  <label
                    key={friend.id}
                    className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-650 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(friend.id)}
                      onChange={() => handleToggleFriend(friend.id)}
                      className="w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="ml-3 flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {friend.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{friend.display_name}</p>
                        <p className="text-gray-400 text-sm">@{friend.username}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={friends.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            Crear Grupo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroup;