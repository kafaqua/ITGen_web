import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface WebSocketHook {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: MessageEvent | null;
  sendMessage: (message: any) => void;
}

export const useWebSocket = (): WebSocketHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket连接成功');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket连接断开');
    });

    newSocket.on('task_update', (data) => {
      setLastMessage({ data: JSON.stringify(data) } as MessageEvent);
    });

    newSocket.on('connected', (data) => {
      console.log('服务器确认连接:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.emit('subscribe_task', message);
    }
  };

  return {
    socket,
    isConnected,
    lastMessage,
    sendMessage
  };
};
