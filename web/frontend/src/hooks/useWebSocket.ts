import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface WebSocketHook {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: MessageEvent | null;
  sendMessage: (message: any) => void;
}

// 全局 socket 实例，确保整个应用只有一个连接
let globalSocket: Socket | null = null;
let isConnecting = false;

// 从环境变量获取API URL，如果没有则使用相对路径
// WebSocket 会通过 Nginx 代理，使用当前页面的 origin
const getWebSocketURL = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    return apiUrl;
  }
  // 使用当前页面的 origin（通过 Nginx 代理）
  return window.location.origin;
};

export const useWebSocket = (): WebSocketHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

  useEffect(() => {
    // 如果已经有全局连接，直接使用
    if (globalSocket) {
      setSocket(globalSocket);
      setIsConnected(globalSocket.connected);
      console.log('🔌 复用现有 WebSocket 连接');
      return;
    }

    // 如果正在连接，等待
    if (isConnecting) {
      return;
    }

    // 创建新连接（只在第一个组件挂载时）
    isConnecting = true;
    const wsUrl = getWebSocketURL();
    console.log('🔌 创建新的 WebSocket 连接:', wsUrl);
    
    globalSocket = io(wsUrl, {
      path: '/socket.io',
      transports: ['polling'], // 只使用 polling，避免 websocket 升级问题
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity, // 无限重连
      forceNew: false,
      upgrade: false // 禁用自动升级到 websocket
    });

    globalSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ WebSocket连接成功');
      isConnecting = false;
    });

    globalSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('🔌 WebSocket连接断开, 原因:', reason);
      // 保持连接，让 Socket.IO 自动重连
    });

    globalSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket连接错误:', error.message);
      isConnecting = false;
    });

    globalSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 WebSocket重连尝试 #${attemptNumber}`);
    });

    globalSocket.on('reconnect', () => {
      setIsConnected(true);
      console.log('✅ WebSocket重连成功');
    });

    globalSocket.on('reconnect_failed', () => {
      console.error('❌ WebSocket重连失败');
      isConnecting = false;
    });

    globalSocket.on('task_update', (data) => {
      console.log('📨 收到任务更新:', data);
      setLastMessage({ data: JSON.stringify(data) } as MessageEvent);
    });

    globalSocket.on('connected', (data) => {
      console.log('✅ 服务器确认连接:', data);
    });

    setSocket(globalSocket);

    // 页面卸载时关闭连接
    const handleBeforeUnload = () => {
      if (globalSocket) {
        console.log('🔌 页面卸载，关闭 WebSocket 连接');
        globalSocket.close();
        globalSocket = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理函数：不在组件卸载时关闭连接，保持全局连接
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 不关闭连接，让它在全局保持，供其他组件使用
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
