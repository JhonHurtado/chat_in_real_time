import React, { useState } from 'react';
import { Users, X, Inbox, Check } from 'lucide-react';
import { SOCKET_URL } from '../socket';

function FriendRequests({ userId, pendingRequests, onClose }) {
  const [requests, setRequests] = useState(pendingRequests);
  const [loading, setLoading] = useState(false);

  const handleRespond = async (requestId, accept) => {
    setLoading(true);
    try {
      const response = await fetch(`${SOCKET_URL}/api/friends/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, accept }),
      });

      if (response.ok) {
        setRequests(requests.filter(r => r.request_id !== requestId));
      } else {
        alert('Error al procesar solicitud');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Users size={24} className="text-gray-300" />
              <span>Solicitudes de Amistad</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Inbox size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-base mb-2">No tienes solicitudes pendientes</p>
              <p className="text-gray-500 text-sm">Las nuevas solicitudes aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.request_id}
                  className="bg-gray-700 rounded-md p-4 hover:bg-gray-650 transition-colors animate-slide-in"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 bg-slate-600 rounded-md flex items-center justify-center text-white font-semibold">
                        {request.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{request.display_name}</p>
                        <p className="text-gray-400 text-xs">@{request.username}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleRespond(request.request_id, true)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                    >
                      <Check size={16} />
                      <span>Aceptar</span>
                    </button>
                    <button
                      onClick={() => handleRespond(request.request_id, false)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                    >
                      <X size={16} />
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default FriendRequests;