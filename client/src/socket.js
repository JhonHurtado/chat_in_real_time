import { io } from 'socket.io-client';
import { REACT_APP_SOCKET_URL } from './config/enviroment';

const SOCKET_URL = REACT_APP_SOCKET_URL;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

export default socket;
export { SOCKET_URL };