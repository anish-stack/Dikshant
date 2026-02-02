import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client"; // ← THIS IS THE KEY IMPORT

const SocketContext = createContext({ 
  socket: null, 
  isConnected: false 
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children, userId }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // ✅ Correct way: use the imported 'io'
    const newSocket = io("https://www.dikapi.olyox.in", {
      query: { userId },
      transports: ["polling", "websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("💥 Socket connection error:", error.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount or userId change
    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};