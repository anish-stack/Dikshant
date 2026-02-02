import { useState, useEffect } from 'react';
import io from 'socket.io-client';

export const useLiveSocket = (videoId, userId, batchId) => {
  const [socket, setSocket] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!videoId || !userId) return;

    const newSocket = io(API_URL_LOCAL_ENDPOINT, {
      query: { videoId, userId, batchId }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-live', { videoId, userId, batchId });
    });

    newSocket.on('users-count', (data) => {
      setLiveUsers(data.users || []);
    });

    newSocket.on('chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [videoId, userId, batchId]);

  const sendChatMessage = (message) => {
    if (socket && isConnected) {
      socket.emit('send-message', {
        videoId,
        userId,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return { socket, liveUsers, chatMessages, isConnected, sendChatMessage };
};