import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, ChevronRight, Clock, CheckCircle2, Truck, Timer, X, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatPrice } from '../lib/utils';

const Orders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000); // Update every 10 seconds to check window
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    try {
      await api.post(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmDelete = window.confirm('Delete this order permanently from your history?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Order deleted');
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      toast.error('Failed to delete order');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'preparing': return <Timer className="w-5 h-5 text-blue-500" />;
      case 'out_for_delivery': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <X className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const canCancel = (createdAt: string, status: string) => {
    if (status !== 'pending') return false;
    const orderTime = new Date(createdAt).getTime();
    const timePassed = now.getTime() - orderTime;
    return timePassed < 5 * 60 * 1000;
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <ShoppingBag className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No orders yet</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 font-bold uppercase tracking-widest text-xs">When you place an order, it will appear here.</p>
        <Link to="/" className="inline-block bg-orange-500 text-white px-10 py-4 rounded-2xl font-black hover:bg-orange-600 transition-all active:scale-95">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Your Orders</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-50 dark:shadow-none hover:shadow-gray-100 dark:hover:border-orange-500/30 transition-all group"
          >
            <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 font-mono tracking-widest uppercase">#{order.id.slice(0, 8)}</span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:text-green-400' :
                      order.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400' :
                      order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400' :
                      'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">
                    {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a') : 'Just now'}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{formatPrice(order.total)}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">{order.items.length} Delicious Items</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800 gap-6">
              <div className="flex items-center gap-5 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <div className="flex -space-x-3">
                  {order.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="w-12 h-12 rounded-2xl border-4 border-white dark:border-gray-900 overflow-hidden shadow-md shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/30 border-4 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-black text-orange-600 dark:text-orange-400">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
                {canCancel(order.createdAt, order.status) && (
                  <button 
                    onClick={() => handleCancelOrder(order.id)}
                    className="shrink-0 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/30 px-5 py-3 rounded-2xl border border-red-100 dark:border-red-900 transition-all active:scale-95"
                  >
                    Cancel Order
                  </button>
                )}
                {!canCancel(order.createdAt, order.status) && order.status !== 'pending' && (
                  <button 
                    onClick={() => handleDeleteOrder(order.id)}
                    className="shrink-0 text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/30 px-5 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
              <Link 
                to={`/orders/${order.id}`}
                className="w-full sm:w-auto bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none"
              >
                Track Now <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
