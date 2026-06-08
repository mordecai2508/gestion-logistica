import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string | undefined ?? 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
  auth: (cb) => {
    cb({ token: useAuthStore.getState().accessToken });
  },
});
