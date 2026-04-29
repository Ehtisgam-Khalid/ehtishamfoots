import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, CreditCard, Truck, ShoppingBag, Loader2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [address, setAddress] = useState('');

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
          // Use OpenStreetMap Nominatim for free reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            setAddress(data.display_name);
            toast.success('Location updated!');
          } else {
            setAddress(`${latitude}, ${longitude}`);
            toast.success('Coordinates added');
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          toast.error('Could not get address, but found coordinates');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Permission denied or location unavailable');
        setLocating(false);
      }
    );
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
        total: total + 5,
        paymentMethod,
        paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
        address: address,
      };

      const response = await api.post('/orders', orderData);
      toast.success('Order placed successfully!');
      clearCart();
      navigate(`/orders/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-50 max-w-2xl mx-auto">
        <div className="bg-orange-50 p-6 rounded-full mb-6">
          <ShoppingBag className="w-16 h-16 text-orange-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 font-medium">Add some delicious meals from the menu to get started.</p>
        <Link to="/" className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center gap-2">
          Browse Menu <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          Your Cart <span className="text-gray-400 font-medium text-lg">({items.length} items)</span>
        </h1>
        
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 overflow-hidden">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div 
                key={item.productId}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -100 }}
                className="p-6 flex flex-col sm:flex-row gap-6 border-b border-gray-50 last:border-0"
              >
                <div className="w-full sm:w-24 h-24 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                    <p className="text-orange-500 font-bold">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button 
                    onClick={() => removeItem(item.productId)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <p className="font-extrabold text-xl text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 p-8 space-y-6 sticky top-24">
          <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Delivery Address</label>
                <button 
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  className="text-xs font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <MapPin className="w-3 h-3" />
                  )}
                  {locating ? 'Locating...' : 'Use My Location'}
                </button>
              </div>
              <textarea 
                placeholder="Where should we bring your food?"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium min-h-[100px] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'cod' 
                    ? 'border-orange-500 bg-orange-50 text-orange-600' 
                    : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Truck className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-widest">Cash on Delivery</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('online')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'online' 
                    ? 'border-orange-500 bg-orange-50 text-orange-600' 
                    : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-widest">Online Payment</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 space-y-4">
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Delivery Fee</span>
              <span>$5.00</span>
            </div>
            <div className="flex justify-between text-xl font-extrabold text-gray-900 pt-2">
              <span>Total</span>
              <span>${(total + 5).toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Place Order <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400 font-medium">
            By placing an order, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cart;
