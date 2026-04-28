import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Order } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Package, Utensils, Truck, CheckCircle2, MapPin, CreditCard, Clock, Loader2, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
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
    fetchOrder();
    
    // Poll for status updates every 10 seconds since we don't have real-time sockets in this simple local backend
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;
  if (!order) return <div className="text-center py-20">Order not found.</div>;

  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { key: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
    { key: 'preparing', label: 'Preparing', icon: Utensils, color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50' },
    { key: 'delivered', label: 'Delivered', icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <Link to="/orders" className="flex items-center gap-2 text-gray-500 font-bold hover:text-orange-500 transition-colors">
        <ChevronLeft className="w-5 h-5" /> Back to Orders
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Order Tracking</h1>
          <p className="text-gray-400 font-mono text-sm tracking-widest font-bold">ID: {order.id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
            order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' :
            order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
            'bg-orange-50 text-orange-600 border-orange-100'
          }`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tracking Stepper */}
      {order.status !== 'cancelled' && (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50">
          <div className="relative flex justify-between items-center max-w-2xl mx-auto">
            {/* Progress Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                className="h-full bg-orange-500 transition-all duration-1000"
              />
            </div>
            
            {steps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-3">
                  <motion.div 
                    initial={false}
                    animate={{ 
                      scale: isCurrent ? 1.2 : 1,
                      backgroundColor: isCompleted ? '#f97316' : '#fff',
                      borderColor: isCompleted ? '#f97316' : '#f3f4f6'
                    }}
                    className={`w-12 h-12 rounded-2xl border-4 flex items-center justify-center transition-all shadow-sm`}
                  >
                    {React.createElement(step.icon as any, { 
                      className: `w-6 h-6 ${isCompleted ? 'text-white' : 'text-gray-300'}` 
                    })}
                  </motion.div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter text-center max-w-[60px] ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" /> Order Summary
          </h3>
          <div className="space-y-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-4">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-16 h-16 rounded-xl object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{item.title}</h4>
                  <p className="text-gray-500 text-sm font-medium">x{item.quantity}</p>
                </div>
                <p className="font-black text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-gray-50 space-y-2">
            <div className="flex justify-between text-gray-500 font-medium text-sm">
              <span>Subtotal</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500 font-medium text-sm">
              <span>Delivery Fee</span>
              <span>$5.00</span>
            </div>
            <div className="flex justify-between text-xl font-black text-gray-900 pt-2">
              <span>Total</span>
              <span>${(order.total + 5).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" /> Delivery Details
            </h3>
            <p className="text-gray-600 font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {order.deliveryAddress || 'No address provided.'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" /> Payment Info
            </h3>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">{order.paymentMethod}</span>
              <span className={`text-xs font-black uppercase tracking-widest ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
