import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Package, Utensils, Truck, CheckCircle2, MapPin, CreditCard, Clock, Loader2, ShoppingBag, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CircularTimer } from '../components/CircularTimer';
import { formatPrice } from '../lib/utils';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const steps = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  { key: 'preparing', label: 'Preparing', icon: Utensils, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50' },
  { key: 'delivered', label: 'Delivered', icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
];

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    // Socket.io for Real-time Status updates
    const socket = io();
    if (profile?.uid) {
      socket.emit('join', profile.uid);
    }

    socket.on('order_status_update', (updatedOrder) => {
      if (updatedOrder.id === id) {
        setOrder(updatedOrder);
        toast.success(`Order status: ${updatedOrder.status.replace('_', ' ')}`, {
          icon: '📍',
          position: 'top-center'
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, profile?.uid]);

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    try {
      await api.post(`/orders/${order.id}/cancel`);
      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const currentStepIndex = order ? steps.findIndex(s => s.key === order.status) : -1;
  const canCancel = order && order.status === 'pending' && (now.getTime() - new Date(order.createdAt).getTime() < 5 * 60 * 1000);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;
  if (!order) return <div className="text-center py-20 font-bold text-gray-500">Order not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/orders" className="group flex items-center gap-2 text-gray-400 font-black hover:text-orange-500 dark:hover:text-white transition-all uppercase text-[10px] tracking-widest bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <ChevronLeft className="w-4 h-4" /> 
          Back to Orders
        </Link>
        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">
          Placed on {format(new Date(order.createdAt), 'MMM dd, p')}
        </span>
      </div>

      {/* Main Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-100 dark:shadow-none flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-6 right-6">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900' :
                order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900' :
                'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900 animate-pulse'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-4 mb-8">
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white leading-tight">Order Progress</h1>
              <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] font-mono">#{order.id.toUpperCase()}</p>
            </div>

            <CircularTimer status={order.status} />

            <div className="w-full mt-12">
              <div className="flex flex-col space-y-8">
                {steps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isLast = index === steps.length - 1;
                  
                  return (
                    <div key={step.key} className="flex items-start gap-6 relative group">
                      {!isLast && (
                        <div className={`absolute left-7 top-10 w-0.5 h-12 -ml-px ${isCompleted ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
                      )}
                      
                      <motion.div 
                        initial={false}
                        animate={{ 
                          scale: isCurrent ? 1.2 : 1,
                          backgroundColor: isCompleted ? '#f97316' : 'transparent',
                        }}
                        className={`w-14 h-14 rounded-2.5xl border-2 shrink-0 flex items-center justify-center transition-all ${
                          isCompleted ? 'border-orange-500 shadow-lg shadow-orange-200 dark:shadow-none' : 'border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        {React.createElement(step.icon as any, { 
                          className: `w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-300 dark:text-gray-700'}` 
                        })}
                      </motion.div>

                      <div className="pt-2">
                        <h4 className={`text-sm font-black uppercase tracking-widest ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
                          {step.label}
                        </h4>
                        <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${isCurrent ? 'text-orange-500' : 'text-gray-400'}`}>
                          {isCurrent ? 'Current Status' : isCompleted ? 'Completed' : 'Upcoming'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canCancel && (
                <div className="mt-12 pt-8 border-t border-gray-50 dark:border-gray-800 flex flex-col items-center gap-5">
                  <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <Info className="w-5 h-5 text-blue-500" /> 
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Change of heart? You have 5 minutes to cancel.
                    </span>
                  </div>
                  <button 
                    onClick={handleCancelOrder}
                    className="w-full sm:w-auto px-12 py-5 rounded-3xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 border border-red-100 dark:border-red-900"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-50 dark:shadow-none space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-2xl">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Address</h3>
              </div>
              <div className="space-y-4">
                <p className="text-gray-400 dark:text-gray-500 font-black text-xs uppercase tracking-[0.2em]">{order.userName}</p>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                  <p className="text-gray-700 dark:text-gray-300 font-bold leading-relaxed">{order.address}</p>
                </div>
                <p className="text-gray-400 font-bold text-[10px] font-mono tracking-widest">{order.userPhone}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-50 dark:shadow-none space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-2xl">
                  <CreditCard className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest text-sm">Payment</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:text-green-400' : 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <div className="bg-gray-900 dark:bg-black text-white p-8 sm:p-10 rounded-[3rem] shadow-2xl shadow-gray-200 dark:shadow-none space-y-8 sticky top-24">
            <div className="flex items-center gap-4">
              <div className="bg-orange-500 p-3 rounded-2xl">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest">Review</h3>
            </div>
            
            <div className="space-y-6">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-5 items-center group">
                  <div className="relative shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-gray-800 group-hover:ring-orange-500 transition-all" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -top-3 -right-3 bg-orange-500 text-white w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center border-4 border-gray-900">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm truncate uppercase tracking-widest">{item.title}</h4>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{formatPrice(item.price)} / unit</p>
                  </div>
                  <p className="font-black text-sm text-orange-400 tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-gray-800 space-y-4">
              <div className="flex justify-between text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                <span>Food Subtotal</span>
                <span className="tabular-nums">{formatPrice(order.total)}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                <span>Shipping</span>
                <span className="text-green-500">FREE delivery</span>
              </div>
              
              <div className="pt-4 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Final Amount</span>
                <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
