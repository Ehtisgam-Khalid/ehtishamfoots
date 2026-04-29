import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Package, Utensils, Truck, CheckCircle2, MapPin, CreditCard, Clock, Loader2, ShoppingBag, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CircularTimer } from '../components/CircularTimer';

const steps = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  { key: 'preparing', label: 'Preparing', icon: Utensils, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50' },
  { key: 'delivered', label: 'Delivered', icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
];

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
    
    // Poll for status updates every 10 seconds
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [id]);

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
    <div className="max-w-5xl mx-auto space-y-8 pb-32 px-4 sm:px-0">
      <div className="flex items-center justify-between">
        <Link to="/orders" className="group flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 transition-all">
          <div className="bg-white p-2 rounded-xl border border-gray-100 group-hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-5 h-5" /> 
          </div>
          Back to Orders
        </Link>
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] font-mono">
          Placed on {format(new Date(order.createdAt), 'MMM dd, p')}
        </span>
      </div>

      {/* Main Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 sm:p-12 rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' :
                order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                'bg-orange-50 text-orange-600 border-orange-100 animate-pulse'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-4 mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">Track Your Feast</h1>
              <p className="text-gray-400 font-bold text-sm tracking-widest">ORDER #{order.id.slice(0, 8).toUpperCase()}</p>
            </div>

            <CircularTimer status={order.status} />

            <div className="w-full max-w-lg mt-12 space-y-12">
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-0">
                {/* Desktop Progress Line */}
                <div className="hidden md:block absolute left-0 right-0 top-6 h-1 bg-gray-50 -z-0">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                  />
                </div>

                {/* Mobile Vertical Line */}
                <div className="md:hidden absolute left-6 top-6 bottom-6 w-1 bg-gray-50 -z-0">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    className="w-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                  />
                </div>
                
                {steps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step.key} className="relative z-10 flex flex-row md:flex-col items-center gap-6 md:gap-4 w-full md:w-auto">
                      <motion.div 
                        initial={false}
                        animate={{ 
                          scale: isCurrent ? 1.3 : 1,
                          backgroundColor: isCompleted ? '#f97316' : '#fff',
                          borderColor: isCompleted ? '#f97316' : '#f9fafb'
                        }}
                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all shadow-2xl ${isCurrent ? 'shadow-orange-200 ring-4 ring-orange-50' : 'shadow-gray-50'}`}
                      >
                        {React.createElement(step.icon as any, { 
                          className: `w-5 h-5 ${isCompleted ? 'text-white' : 'text-gray-300'}` 
                        })}
                      </motion.div>
                      <div className="flex flex-col items-start md:items-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="md:hidden text-[8px] font-bold text-orange-500 uppercase tracking-widest mt-1">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canCancel && (
                <div className="pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Info className="w-4 h-4" /> Change of heart? You have 5 minutes to cancel.
                  </div>
                  <button 
                    onClick={handleCancelOrder}
                    className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-all border border-red-100"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                <div className="bg-orange-50 p-2 rounded-xl"><MapPin className="w-5 h-5 text-orange-500" /></div>
                Delivery Address
              </h3>
              <div className="space-y-4">
                <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{order.userName}</p>
                <p className="text-gray-700 font-medium leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  {order.address}
                </p>
                <p className="text-gray-400 font-bold text-xs">{order.userPhone}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                <div className="bg-green-50 p-2 rounded-xl"><CreditCard className="w-5 h-5 text-green-500" /></div>
                Payment Method
              </h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'
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
          <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200 space-y-8 h-fit">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-orange-500" /> Order Summary
            </h3>
            <div className="space-y-6">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="relative">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-gray-800" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-gray-900">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{item.title}</h4>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">${item.price.toFixed(2)} / unit</p>
                  </div>
                  <p className="font-black text-sm text-orange-400">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-gray-800 space-y-4">
              <div className="flex justify-between text-gray-400 font-bold text-xs uppercase tracking-widest">
                <span>Subtotal</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 font-bold text-xs uppercase tracking-widest">
                <span>Delivery</span>
                <span className="text-green-500">FREE</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-white pt-2">
                <span>Total</span>
                <span className="text-orange-500">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
