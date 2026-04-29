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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [address, setAddress] = useState('');
  const [addons, setAddons] = useState<Product[]>([]);
  const [distance, setDistance] = useState<number | null>(null);

  // Restaurant Location (e.g., Karachi Central)
  const RESTAURANT_LOC = { lat: 24.9107, lon: 67.0924 };

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

  const discount = total >= 600 ? 50 : 0;
  
  // Dynamic Delivery Fee Logic:
  // <= 2km: Rs. 250
  // > 2km: Rs. 400
  const deliveryFee = distance === null ? 0 : (distance <= 2 ? 250 : 400);
  
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
        deliveryFee: deliveryFee
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
                className="p-8 flex flex-col sm:flex-row gap-8 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className="w-full sm:w-28 h-28 rounded-3xl overflow-hidden shadow-xl flex-shrink-0 relative group">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-black text-xl text-gray-900 dark:text-white line-clamp-1">{item.title}</h3>
                    <p className="text-orange-500 font-black text-lg mt-1">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-4 sm:mt-0">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-gray-600 dark:text-gray-400 active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-black text-gray-900 dark:text-white tabular-nums">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-gray-600 dark:text-gray-400 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between py-1">
                  <button 
                    onClick={() => removeItem(item.productId)}
                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                  <p className="font-black text-2xl text-gray-900 dark:text-white tabular-nums">
                    {formatPrice(item.price * item.quantity)}
                  </p>
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

      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-100 dark:shadow-none p-10 space-y-8 sticky top-24">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">Checkout</h2>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Delivery Address</label>
                <button 
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-white hover:bg-orange-500 bg-orange-50 dark:bg-orange-950/30 px-5 py-2.5 rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 border border-orange-100 dark:border-orange-900 shadow-sm active:scale-95"
                >
                  {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                  {locating ? 'Searching...' : 'Current Location 📍'}
                </button>
              </div>
              <textarea 
                placeholder="Ex: House #123, Road 45, Street 6..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-6 bg-gray-50 dark:bg-[#0a0a0a] border-2 border-transparent focus:border-orange-500 dark:text-white rounded-[2.5rem] outline-none transition-all font-bold text-sm min-h-[140px] resize-none shadow-inner"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all ${
                    paymentMethod === 'cod' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' 
                    : 'border-gray-50 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Truck className="w-7 h-7" />
                  <span className="text-[10px] font-black uppercase tracking-widest">COD</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('online')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all ${
                    paymentMethod === 'online' 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' 
                    : 'border-gray-50 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <CreditCard className="w-7 h-7" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Card</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] space-y-4">
            <div className="flex justify-between text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-widest">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
            {discount > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-between text-green-500 font-black text-sm uppercase tracking-widest bg-green-50 dark:bg-green-950/30 p-3 rounded-xl border border-green-100 dark:border-green-900"
              >
                <div className="flex items-center gap-2"><Ticket className="w-4 h-4" /> Coupon Applied</div>
                <span className="tabular-nums">-{formatPrice(discount)}</span>
              </motion.div>
            )}
            {total < 600 && (
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic text-center border-t border-gray-100 dark:border-gray-700 pt-3">
                Order over Rs. 600 for a Rs. 50 Discount!
              </div>
            )}
            <div className="flex justify-between text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-widest border-t border-gray-100 dark:border-gray-700 pt-4">
              <span>Delivery</span>
              <span className={deliveryFee > 0 ? "text-gray-900 dark:text-white tabular-nums" : "text-green-500"}>
                {deliveryFee > 0 ? formatPrice(deliveryFee) : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between text-3xl font-black text-gray-900 dark:text-white pt-4">
              <span>Total</span>
              <span className="text-orange-500 tabular-nums">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 dark:shadow-none active:scale-95 disabled:opacity-50 group"
          >
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                Confirm Order <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
