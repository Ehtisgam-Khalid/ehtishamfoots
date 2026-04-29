import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Bell, ShoppingBag, Package } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notify: (title: string, message: string, type?: 'info' | 'success' | 'order' | 'product') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();

    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    // Request desktop notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    // Join rooms
    socket.emit('join', user.uid);
    if (user.role === 'admin') {
      socket.emit('join_admin');
    }

    // Listeners
    socket.on('new_order', (order) => {
      notify('New Order Received!', `Order from ${order.userName} for $${order.total.toFixed(2)}`, 'order');
    });

    socket.on('order_status_update', (order) => {
      notify('Order Status Updated', `Your order is now ${order.status.replace('_', ' ')}`, 'info');
    });

    socket.on('new_product', (product) => {
      notify('New Product Added!', `ShamFood added ${product.title}`, 'product');
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_update');
      socket.off('new_product');
    };
  }, [socket, user]);

  const notify = (title: string, message: string, type: 'info' | 'success' | 'order' | 'product' = 'info') => {
    // Play sound for all notification types in this advanced mode, or just for specific ones
    if (type === 'order' || type === 'product' || type === 'info') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log('Audio play failed', e));
      }
    }

    // System Notification if permitted and tab is backgrounded
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== 'visible') {
      new Notification(title, { body: message, icon: '/favicon.ico' });
    }

    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-gray-100 overflow-hidden`}
      >
        <div className="flex-1 w-0 p-6">
          <div className="flex items-start">
            <div className={`flex-shrink-0 pt-0.5 ${
              type === 'order' ? 'text-orange-500' : 
              type === 'product' ? 'text-green-500' :
              'text-blue-500'
            }`}>
              {type === 'order' ? <ShoppingBag className="h-10 w-10" /> : 
               type === 'product' ? <Package className="h-10 w-10" /> :
               <Bell className="h-10 w-10" />}
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-black text-gray-900 leading-tight">
                {title}
              </p>
              <p className="mt-1 text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-100 bg-gray-50/50">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
