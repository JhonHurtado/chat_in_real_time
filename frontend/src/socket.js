import { io } from 'socket.io-client';

// Cambia esto a la IP de tu servidor si estás en una red local
// Por ejemplo: 'http://192.168.1.100:3001'
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

export default socket;
export { SOCKET_URL };