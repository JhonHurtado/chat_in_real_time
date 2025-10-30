import { io } from 'socket.io-client';

const SOCKET_URL = 'http://10.197.210.182:3001';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

export default socket;
export { SOCKET_URL };