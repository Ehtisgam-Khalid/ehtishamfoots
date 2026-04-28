import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, ChevronRight, Clock, CheckCircle2, Truck, Timer } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

const Orders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders');
        setOrders(response.data);
      } catch (err) {
        console.error('Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'preparing': return <Timer className="w-5 h-5 text-blue-500" />;
      case 'out_for_delivery': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) return <div className="flex justify-center p-20">Loading orders...</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-8 font-medium">When you place an order, it will appear here.</p>
        <Link to="/" className="text-orange-500 font-bold hover:underline">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold text-gray-900">Your Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-2xl">
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400 font-mono tracking-tighter uppercase">{order.id.slice(0, 8)}</span>
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' :
                      order.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs font-medium mt-1">
                    {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a') : 'Just now'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900">${order.total.toFixed(2)}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{order.items.length} Items</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex -space-x-4">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-sm">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                    +{order.items.length - 3}
                  </div>
                )}
              </div>
              <Link 
                to={`/orders/${order.id}`}
                className="flex items-center gap-1 text-orange-500 font-bold hover:gap-2 transition-all p-2"
              >
                Track Order <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
