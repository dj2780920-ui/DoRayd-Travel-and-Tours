import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../components/Login';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
    autoConnect: false
});

export const useSocket = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(socket.connected);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
        if (!socket.connected) {
            socket.connect();
        }

        const onConnect = () => {
          console.log('✅ Socket connected successfully');
          setConnected(true);
          // Join rooms after connection is established
          socket.emit('join', user.role);
          if (user.role === 'customer') {
              socket.emit('join', user._id); // Join a room for personal notifications
          }
        };

        const onDisconnect = () => {
          console.log('🔌 Socket disconnected');
          setConnected(false);
        };

        const onNotification = (data) => {
          setNotifications((prev) => [{...data, id: data.id || Date.now(), timestamp: new Date() }, ...prev]);
        };
        
        // --- Admin/Employee notifications ---
        const handleNewBooking = (data) => onNotification(data);
        const handleNewMessage = (data) => onNotification(data);
        const handleNewReview = (data) => onNotification(data);
        const handleNewUser = (data) => onNotification(data);

        // --- Customer notifications ---
        const handleBookingUpdate = (data) => onNotification(data);
        const handleNewCar = (data) => onNotification(data);
        const handleNewTour = (data) => onNotification(data);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Register listeners based on role
        if (user.role === 'admin' || user.role === 'employee') {
            socket.on('new-booking', handleNewBooking);
            socket.on('new-message', handleNewMessage);
            socket.on('new-review', handleNewReview);
            socket.on('new-user', handleNewUser);
        }
        
        if (user.role === 'customer') {
            socket.on('booking-update', handleBookingUpdate);
            socket.on('new-car', handleNewCar);
            socket.on('new-tour', handleNewTour);
        }

        // Cleanup listeners on component unmount
        return () => {
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
          socket.off('new-booking', handleNewBooking);
          socket.off('new-message', handleNewMessage);
          socket.off('new-review', handleNewReview);
          socket.off('new-user', handleNewUser);
          socket.off('booking-update', handleBookingUpdate);
          socket.off('new-car', handleNewCar);
          socket.off('new-tour', handleNewTour);
        };
    } else {
        if (socket.connected) {
            socket.disconnect();
        }
    }
  }, [user]);

  const addNotification = useCallback((message, type = 'info', link = '#') => {
    setNotifications(prev => [{ id: Date.now(), message, type, link, timestamp: new Date() }, ...prev]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    socket,
    connected,
    notifications,
    addNotification,
    clearNotifications,
    removeNotification,
  };
};