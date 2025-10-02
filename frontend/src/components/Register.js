import React, { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { SOCKET_URL } from '../socket';

function Register({ onRegister, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${SOCKET_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, displayName }),
      });

      const data = await response.json();

      if (response.ok) {
        onRegister(data.user);
      } else {
        setError(data.error || 'Error al registrarse');
      }
    } catch (error) {
      setError('Error de conexión. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-slide-in relative z-10">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserPlus size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Crear Cuenta
          </h1>
          <p className="text-gray-400">Comienza a chatear ahora</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              placeholder="Ej: juan_perez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre para Mostrar
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-md p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Creando cuenta...
              </span>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={onBack}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;