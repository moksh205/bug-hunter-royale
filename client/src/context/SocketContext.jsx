// ============================================================
//  SocketContext - ONE Socket.io connection for the whole app.
//
//  It connects as soon as the user logs in, and disconnects on logout.
//  Keeping one shared socket means moving from the Lobby to the
//  Battle Arena does NOT drop the connection.
//
//  Usage:  const socket = useSocket();   // null until connected/logged in
// ============================================================
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, logout } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return; // not logged in -> no socket

    // The server reads this token in its io.use() auth middleware.
    const s = io(API_URL, { auth: { token } });

    // Server said our token is bad -> force a fresh login.
    s.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') logout();
    });

    setSocket(s);

    // Cleanup: runs on logout or when the app closes.
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token, logout]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  return useContext(SocketContext);
}
