import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Package, Utensils, Truck, CheckCircle2, MapPin, CreditCard, Clock, Loader2, ShoppingBag, X, Info, Star } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CircularTimer } from '../components/CircularTimer';
import { formatPrice } from '../lib/utils';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { ReviewModal } from '../components/ReviewModal';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const DriverIcon = L.divIcon({
  className: 'custom-driver-icon',
  html: `<div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl animate-bounce">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5h-7v6h2"/><path d="M13 9h7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const DestinationIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div class="w-8 h-8 bg-black rounded-full flex items-center justify-center border-4 border-white shadow-xl">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const SetMapCenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [driverPos, setDriverPos] = useState<[number, number]>([24.8607, 67.0011]); // Default Karachi
  const [destPos] = useState<[number, number]>([24.8757, 67.0251]); // Destination
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (order?.status === 'out_for_delivery') {
      const interval = setInterval(() => {
        setDriverPos(prev => {
          const latDiff = (destPos[0] - prev[0]) * 0.05;
          const lngDiff = (destPos[1] - prev[1]) * 0.05;
          return [prev[0] + latDiff, prev[1] + lngDiff];
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [order?.status, destPos]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    const mapDelay = setTimeout(() => setMapReady(true), 500);
    return () => {
      clearInterval(timer);
      clearTimeout(mapDelay);
    };
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

      {/* Real-time Tracking Map */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-[400px] w-full rounded-[2.5rem] overflow-hidden border-8 border-white dark:border-gray-900 shadow-2xl z-0"
      >
        {mapReady ? (
          <MapContainer 
            center={driverPos} 
            zoom={13} 
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User Destination Marker */}
            <Marker position={destPos} icon={DestinationIcon}>
              <Popup>
                <div className="text-center font-bold">
                  <p className="text-[10px] uppercase text-gray-400">Delivery Address</p>
                  <p className="text-sm">{order.address}</p>
                </div>
              </Popup>
            </Marker>

            {/* Driver Marker */}
            <Marker position={driverPos} icon={DriverIcon}>
              <Popup>
                <div className="text-center font-bold">
                  <p className="text-[10px] uppercase text-orange-500">Live Driver Status</p>
                  <p className="text-sm">On the way to your door!</p>
                </div>
              </Popup>
            </Marker>

            {/* Path between driver and destination */}
            <Polyline 
              positions={[driverPos, destPos]} 
              color="#f97316" 
              weight={4} 
              dashArray="8, 12" 
              opacity={0.6}
            />

            <SetMapCenter center={driverPos} />
          </MapContainer>
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initalizing GPS Tracking...</p>
            </div>
          </div>
        )}

        {/* Map Footer Info */}
        <div className="absolute bottom-6 left-6 right-6 z-[1000] flex flex-wrap gap-4 items-center justify-between pointer-events-none">
          <div className="bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto">
            <Truck className="w-5 h-5" />
            <div className="text-left">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-80 leading-none">Est. Arrival</p>
              <p className="text-sm font-black uppercase tracking-tighter leading-none mt-1">12 - 15 Mins</p>
            </div>
          </div>
          
          <button className="bg-white text-gray-900 px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest pointer-events-auto hover:bg-gray-50 transition-colors">
            Call Driver
          </button>
        </div>
      </motion.div>

      {/* Horizontal Progress Tracker */}
      <div className="bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-50 dark:shadow-none overflow-x-auto hide-scrollbar">
        <div className="min-w-[600px] flex justify-between relative px-4">
          {/* Progress Bar Background */}
          <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 z-0 rounded-full" />
          
          {/* Active Progress Bar */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: currentStepIndex >= 0 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : 0 }}
            className="absolute top-1/2 left-12 h-1 bg-orange-500 -translate-y-1/2 z-0 rounded-full origin-left"
            style={{ maxWidth: 'calc(100% - 6rem)' }}
          />

          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const StepIcon = step.icon;
            
            // Map Tailwind color classes to hex or use directly if possible
            // For simplicity and consistency with the design, we'll use the scale but let's make the current icon pop with its specific color if not completed
            
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-4 w-28">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isCurrent ? 1.15 : 1,
                    backgroundColor: isCompleted ? (isCurrent ? '#f97316' : '#fff') : '#f8fafc',
                    borderColor: isCompleted ? '#f97316' : (isCurrent ? '#f97316' : '#e2e8f0'),
                  }}
                  className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                    isCompleted ? 'shadow-xl shadow-orange-500/10' : 'dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <StepIcon className={`w-6 h-6 ${isCompleted ? (isCurrent ? 'text-white' : step.color) : 'text-gray-300'}`} />
                </motion.div>
                <div className="text-center">
                  <p className={`text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <motion.span 
                      layoutId="current-dot"
                      className="block w-2 h-2 bg-orange-500 rounded-full mx-auto mt-1 shadow-sm" 
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

            {order.status === 'delivered' && !hasReviewed && (
              <div className="mt-8">
                <button 
                  onClick={() => setShowReviewModal(true)}
                  className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-500/20"
                >
                  <Star className="w-5 h-5 fill-white" /> Rate This Order
                </button>
              </div>
            )}

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
                          backgroundColor: isCompleted ? (isCurrent ? '#f97316' : '#fff') : 'transparent',
                          borderColor: isCompleted ? (isCurrent ? '#f97316' : '#fff') : '#e5e7eb',
                        }}
                        className={`w-14 h-14 rounded-2.5xl border-2 shrink-0 flex items-center justify-center transition-all ${
                          isCompleted ? (isCurrent ? 'shadow-xl shadow-orange-500/20' : 'shadow-md') : 'border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        {React.createElement(step.icon as any, { 
                          className: `w-6 h-6 ${isCompleted ? (isCurrent ? 'text-white' : step.color) : 'text-gray-300 dark:text-gray-700'}` 
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
      
      <ReviewModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        orderId={order.id}
        onSuccess={() => setHasReviewed(true)}
      />
    </div>
  );
};

export default OrderDetails;
