/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import io from "socket.io-client";

const SocketContext = createContext();

const DEFAULT_POMODORO = {
  running: false,
  remaining: 25 * 60,
  duration: 25 * 60,
};

export const SocketProvider = ({ children }) => {
  const [socket] = useState(() => {
    const socketUrl = import.meta.env.VITE_API_BASE_URL;
    if (!socketUrl) {
      return null;
    }

    return io(socketUrl, {
      transports: ["websocket"],
      autoConnect: false,
      withCredentials: true,
      auth: {
        token: localStorage.getItem("token"),
      },
    });
  });
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pomodoro, setPomodoro] = useState(DEFAULT_POMODORO);

  useEffect(() => {
    if (!socket) return;

    socket.connect();

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setConnected(false);
    };

    const handleMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat:message", handleMessage);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat:message", handleMessage);
      socket.disconnect();
    };
  }, [socket]);

  const joinRoom = (roomId) => {
    if (!socket) return;
    socket.emit("join", { roomId });
  };

  const sendMessage = (roomId, text) => {
    if (!socket || !text.trim()) return;

    socket.emit("chat:message", {
      roomId,
      text,
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        setMessages, 
        pomodoro,
        setPomodoro,
        joinRoom,
        sendMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
