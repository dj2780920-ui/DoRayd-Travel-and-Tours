import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

// FIX: Create a single socket instance outside the hook and prevent auto-connection
const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
    autoConnect: false
});

export const useSocket = () => {
  const [connected, setConnected] = useState(socket.connected);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // FIX: Only attempt to connect if the socket isn't already connected.
    // This prevents the double-mount issue in React Strict Mode.
    if (!socket.connected) {
        socket.connect();
    }

    const onConnect = () => {
      console.log('✅ Socket connected successfully');
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    };

    const onNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    // Listen for backend events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new-booking', (booking) => {
        onNotification({
            id: booking._id || Date.now(),
            message: `New booking received: ${booking.bookingReference}`,
            type: 'info',
            timestamp: new Date()
        });
    });

    // Cleanup listeners on component unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new-booking');
    };
  }, []); // Empty dependency array ensures this runs only once

  const addNotification = useCallback((message, type = 'info') => {
    setNotifications(prev => [{ id: Date.now(), message, type, timestamp: new Date() }, ...prev]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    socket, // --- ADD THIS LINE ---
    connected,
    notifications,
    addNotification,
    clearNotifications,
  };
};