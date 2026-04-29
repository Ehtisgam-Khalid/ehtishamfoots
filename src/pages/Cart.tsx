import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, CreditCard, Truck, ShoppingBag, Loader2, MapPin, Coffee, Beer, IceCream, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, total, clearCart, addItem } = useCart();
  const { user, setProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [address, setAddress] = useState('');
  const [addons, setAddons] = useState<Product[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<'standard' | 'express'>('standard');
  const [isCouponClaimed, setIsCouponClaimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Restaurant Location (e.g., Karachi Central)
  const RESTAURANT_LOC = { lat: 24.9107, lon: 67.0924 };

  useEffect(() => {
    if (user?.lastCouponClaimedAt) {
      const lastClaim = new Date(user.lastCouponClaimedAt);
      const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      
      if (now < nextClaim) {
        setTimeLeft(nextClaim.getTime() - now.getTime());
      }
    }
  }, [user]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1000 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleClaimReward = async () => {
    if (total < 600) {
      toast.error('Minimum order Rs. 600 required for coupon');
      return;
    }
    
    try {
      const res = await api.post('/auth/claim-reward');
      setIsCouponClaimed(true);
      toast.success(res.data.message);
      // Refresh profile to update lastCouponClaimedAt
      const meRes = await api.get('/auth/me');
      setProfile(meRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to claim reward');
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${mins}m ${secs}s`;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  useEffect(() => {
    // Fetch some products as add-ons (e.g., drinks category)
    api.get('/products').then(res => {
      const drinks = res.data.filter((p: Product) => 
        p.category.toLowerCase().includes('drink') || 
        p.category.toLowerCase().includes('beverage') ||
        p.title.toLowerCase().includes('coke') ||
        p.title.toLowerCase().includes('water')
      ).slice(0, 4);
      setAddons(drinks);
    }).catch(() => {});
  }, []);

  const discount = isCouponClaimed ? 50 : 0;
  
  // Dynamic Delivery Fee Logic:
  // <= 2km: Rs. 250
  // > 2km: Rs. 400
  // Express: Add Rs. 150 extra
  const baseDeliveryFee = distance === null ? 0 : (distance <= 2 ? 250 : 400);
  const deliveryFee = baseDeliveryFee + (deliveryType === 'express' ? 150 : 0);
  
  const finalTotal = Math.max(0, total - discount + deliveryFee);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Calculate distance to restaurant
          const dist = calculateDistance(latitude, longitude, RESTAURANT_LOC.lat, RESTAURANT_LOC.lon);
          setDistance(dist);

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            const addr = data.address;
            // Get most specific parts first
            const parts = [];
            if (addr.house_number || addr.building) parts.push(addr.house_number || addr.building);
            if (addr.road) parts.push(addr.road);
            if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
            if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
            
            const formatted = parts.join(', ');
            setAddress(formatted || data.display_name);
            toast.success(`Location detected! (${dist.toFixed(1)}km) 📍`);
          } else {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            toast.success('Coordinates captured');
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          toast.error('Location service busy');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Location access denied');
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const playThanksVoice = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Thanks for your order! Your food is being prepared.");
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to place an order');
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!address.trim()) {
      toast.error('Please provide a delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items,
        total: finalTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
        address: address,
        discount: discount,
        deliveryFee: deliveryFee,
        userName: user.name,
        userPhone: user.phone
      };

      const response = await api.post('/orders', orderData);
      toast.success('Food is on its way!');
      playThanksVoice();
      clearCart();
      navigate(`/orders/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-100 dark:shadow-none max-w-2xl mx-auto">
        <div className="bg-orange-50 dark:bg-orange-950/30 p-8 rounded-full mb-6">
          <ShoppingBag className="w-16 h-16 text-orange-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Feeling Hungry?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 font-bold">Your cart is empty. Let's fill it with something yummy!</p>
        <Link to="/" className="bg-orange-500 text-white px-10 py-4 rounded-[2rem] font-black shadow-lg shadow-orange-100 dark:shadow-none hover:bg-orange-600 transition-all flex items-center gap-3 active:scale-95">
          Order Now <ArrowRight className="w-6 h-6" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-32">
      <div className="lg:col-span-2 space-y-10">
        <div className="flex justify-between items-end">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-4">
            Cart <span className="text-gray-400 dark:text-gray-500 font-bold text-xl uppercase tracking-widest">{items.length} items</span>
          </h1>
          <button onClick={() => clearCart()} className="text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/30 px-4 py-2 rounded-xl transition-all">Clear All</button>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-100 dark:shadow-none overflow-hidden">
          <AnimatePresence mode='popLayout'>
            {items.map((item) => (
              <motion.div 
                key={item.productId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-5 sm:p-8 flex flex-row gap-5 sm:gap-8 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-orange-50/10 transition-colors"
              >
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl flex-shrink-0 relative group">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-0.5 sm:py-1 min-w-0">
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-black text-sm sm:text-2xl text-gray-900 dark:text-white line-clamp-1 uppercase tracking-tight">{item.title}</h3>
                      <button 
                        onClick={() => removeItem(item.productId)}
                        className="sm:hidden p-1.5 text-red-500/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-orange-500 font-black text-xs sm:text-xl tabular-nums">{formatPrice(item.price)}</p>
                  </div>

                  <div className="flex justify-between items-center mt-3 sm:mt-6">
                    <div className="flex items-center gap-1.5 sm:gap-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl sm:rounded-2xl">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-lg sm:rounded-xl transition-all text-gray-600 dark:text-gray-400 active:scale-95 disabled:opacity-30"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3 sm:w-4 h-4" />
                      </button>
                      <span className="w-6 sm:w-10 text-center font-black text-xs sm:text-lg text-gray-900 dark:text-white tabular-nums">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-lg sm:rounded-xl transition-all text-gray-600 dark:text-gray-400 active:scale-95"
                      >
                        <Plus className="w-3 h-3 sm:w-4 h-4" />
                      </button>
                    </div>

                    <button 
                      onClick={() => removeItem(item.productId)}
                      className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add-ons Section */}
        {addons.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Coffee className="w-6 h-6 text-orange-500" /> Complete Your Meal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addons.map(addon => (
                <div key={addon.id} className="bg-white dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-xl hover:shadow-gray-100 dark:hover:shadow-none transition-all group">
                  <img src={addon.image} alt={addon.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">{addon.title}</h4>
                    <p className="text-xs font-black text-orange-500">{formatPrice(addon.price)}</p>
                  </div>
                  <button 
                    onClick={() => addItem(addon)}
                    className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 p-3 rounded-2xl hover:bg-orange-500 hover:text-white transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 sm:space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] sm:rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-none p-5 sm:p-12 space-y-6 sm:space-y-10 sticky top-24">
          <div className="space-y-0.5 sm:space-y-2">
            <h2 className="text-xl sm:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Checkout</h2>
            <p className="text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest pl-0.5">Complete your order</p>
          </div>
          
          <div className="space-y-5 sm:space-y-8">
            <div className="space-y-2.5 sm:space-y-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-0.5">Delivery Speed</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <button 
                  onClick={() => setDeliveryType('standard')}
                  className={`p-3 sm:p-5 rounded-xl sm:rounded-3xl border-2 transition-all flex flex-col items-center gap-1 sm:gap-2 group ${
                    deliveryType === 'standard' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 ring-4 ring-orange-500/10' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <Truck className={`w-4 h-4 sm:w-6 sm:h-6 ${deliveryType === 'standard' ? 'text-orange-500' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <span className="font-black text-[10px] sm:text-sm text-gray-900 dark:text-white block tracking-tight">Standard</span>
                    <span className="text-[8px] sm:text-[10px] font-bold text-gray-400">30-45m</span>
                  </div>
                </button>
                <button 
                  onClick={() => setDeliveryType('express')}
                  className={`p-3 sm:p-5 rounded-xl sm:rounded-3xl border-2 transition-all flex flex-col items-center gap-1 sm:gap-2 group ${
                    deliveryType === 'express' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 ring-4 ring-orange-500/10' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="relative">
                    <Truck className={`w-4 h-4 sm:w-6 sm:h-6 ${deliveryType === 'express' ? 'text-orange-500' : 'text-gray-400'}`} />
                    <span className="absolute -top-0.5 -right-0.5 text-[8px] sm:text-[10px]">⚡</span>
                  </div>
                  <div className="text-center">
                    <span className="font-black text-[10px] sm:text-sm text-gray-900 dark:text-white block tracking-tight">Express</span>
                    <span className="text-[8px] sm:text-[10px] font-bold text-gray-400">+PKR 150</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-0.5">Delivery Address</label>
                <button 
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-2 sm:px-5 py-1.5 rounded-lg transition-all flex items-center gap-1 border border-orange-100 dark:border-orange-900"
                >
                  {locating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <MapPin className="w-2.5 h-2.5" />}
                  {locating ? 'Locating' : 'Locate Me'}
                </button>
              </div>
              <textarea 
                placeholder="Where should we bring your food?"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-4 sm:p-6 bg-gray-50 dark:bg-[#0a0a0a] border-2 border-transparent focus:border-orange-500 dark:text-white rounded-[1.25rem] sm:rounded-[2.5rem] outline-none transition-all font-bold text-[11px] sm:text-sm min-h-[80px] sm:min-h-[120px] resize-none shadow-inner"
              />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-0.5">Daily Reward</label>
              {timeLeft !== null && timeLeft > 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl sm:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 text-center space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-orange-500">Reward In</p>
                  <p className="text-base sm:text-2xl font-black text-gray-900 dark:text-white font-mono">{formatTime(timeLeft)}</p>
                </div>
              ) : (
                <button 
                  onClick={handleClaimReward}
                  disabled={total < 600 || isCouponClaimed}
                  className={`w-full group p-4 sm:p-6 rounded-xl sm:rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center gap-1 sm:gap-2 ${
                    total >= 600 && !isCouponClaimed
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 hover:scale-[1.01]' 
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                  }`}
                >
                  <Ticket className={`w-5 h-5 sm:w-8 sm:h-8 ${total >= 600 && !isCouponClaimed ? 'text-orange-500 animate-bounce' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <span className="font-black text-[10px] sm:text-sm text-gray-900 dark:text-white block uppercase tracking-tight">
                      {isCouponClaimed ? 'Coupon Applied! ✅' : 'Claim PKR 50 Discount'}
                    </span>
                  </div>
                </button>
              )}
            </div>

            <div className="space-y-2 sm:space-y-4">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-0.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <button 
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex flex-col items-center gap-1.5 p-3 sm:p-6 rounded-xl sm:rounded-[2.5rem] border-2 transition-all ${
                    paymentMethod === 'cod' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className={`p-2 sm:p-4 rounded-lg sm:rounded-2xl transition-all ${paymentMethod === 'cod' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white dark:bg-gray-700 text-gray-400'}`}>
                    <Truck className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${paymentMethod === 'cod' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('online')}
                  className={`flex flex-col items-center gap-1.5 p-3 sm:p-6 rounded-xl sm:rounded-[2.5rem] border-2 transition-all ${
                    paymentMethod === 'online' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className={`p-2 sm:p-4 rounded-lg sm:rounded-2xl transition-all ${paymentMethod === 'online' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white dark:bg-gray-700 text-gray-400'}`}>
                    <CreditCard className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${paymentMethod === 'online' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>Card</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-gray-900 dark:bg-black rounded-[2rem] sm:rounded-[3rem] space-y-4 sm:space-y-6 shadow-2xl">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between text-gray-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="tabular-nums text-white">{formatPrice(total)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between items-center text-green-500 font-black text-[10px] sm:text-xs uppercase tracking-widest py-2 border-y border-white/5">
                  <div className="flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5 shadow-sm" /> Reward Applied</div>
                  <span className="tabular-nums">-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest">
                <span>Delivery</span>
                <span className={deliveryFee > 0 ? "text-white tabular-nums" : "text-green-500 font-black"}>
                  {deliveryFee > 0 ? formatPrice(deliveryFee) : 'FREE'}
                </span>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 flex justify-between items-end border-t border-white/10">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Total</span>
              <span className="text-2xl sm:text-4xl font-black text-orange-500 tabular-nums tracking-tighter">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-orange-500 text-white p-5 sm:p-7 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-lg sm:text-xl flex items-center justify-center gap-3 sm:gap-4 hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 group overflow-hidden relative"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
            ) : (
              <>
                <div className="absolute top-0 left-0 w-1 sm:w-2 h-full bg-white/20 -skew-x-12 -translate-x-4 group-hover:translate-x-80 transition-transform duration-700" />
                Place Order <ArrowRight className="w-5 h-5 sm:w-7 sm:h-7 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
