// src/lib/socket.ts
// ─────────────────────────────────────────────────────────────────
// Manages a single shared Socket.io client connection.
// Import getSocket() wherever real-time features are needed.
// ─────────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}
