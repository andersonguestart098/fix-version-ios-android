import io, { Socket } from "socket.io-client";

const SOCKET_URL = "https://cemear-b549eb196d7c.herokuapp.com";

class SocketManager {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private listeners: { [event: string]: ((...args: any[]) => void)[] } = {};

  connect(userId: string): void {
    if (this.socket && this.socket.connected && this.userId === userId) {
      console.log("✅ Socket já conectado:", this.socket.id);
      this.emit("userConnected", userId);
      return;
    }

    this.userId = userId;
    this.socket = io(SOCKET_URL, {
      query: { userId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket global conectado:", this.socket?.id);
      this.emit("userConnected", userId);
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Erro ao conectar ao socket:", error.message);
    });

    this.socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket desconectado:", reason);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.listeners = {};
      console.log("🔌 Socket desconectado");
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      if (!this.listeners[event]) this.listeners[event] = [];
      if (!this.listeners[event].includes(callback)) {
        this.listeners[event].push(callback);
        this.socket.on(event, callback);
      }
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket && this.listeners[event]) {
      if (callback) {
        this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
        this.socket.off(event, callback);
      } else {
        this.listeners[event].forEach((cb) => this.socket.off(event, cb));
        this.listeners[event] = [];
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn(`⚠️ Tentativa de emitir ${event} sem conexão`);
    }
  }
}

export const socketManager = new SocketManager();