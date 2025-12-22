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
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pomodoro, setPomodoro] = useState(DEFAULT_POMODORO);

  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_API_BASE_URL;
      if (!socketUrl) return;

    const s = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: false,          
      withCredentials: true,
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    s.connect();

    s.on("connect", () => {
      console.log("Socket connected:", s.id);
      setConnected(true);
    });

    s.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
    });

    s.on("chat:message", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

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
