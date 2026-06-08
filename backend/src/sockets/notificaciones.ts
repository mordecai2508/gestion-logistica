import { Server, Socket } from 'socket.io';

export function registerNotificacionHandlers(_io: Server, socket: Socket): void {
  if (socket.data.userId) {
    void socket.join(`user:${socket.data.userId as string}`);
  }
}
