import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff, Phone, Smartphone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    if (!phone || !name || !email || !password) {
      toast.error('Please fill all fields first');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { email, phone });
      setOtpStep(true);
      toast.success(response.data.message);
      if (response.data.debug_otp) {
        setDebugOtp(response.data.debug_otp);
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !otpStep) {
      handleSendOTP();
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
        navigate('/');
      } else {
        // Register on our server with OTP
        await register(name, email, password, phone, otp);
        toast.success('Account verified and created!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const message = error.response?.data?.message || error.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div id="recaptcha-container"></div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 sm:p-10 border border-gray-100"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">
            {isLogin ? 'Welcome Back' : (otpStep ? 'Verify Account' : 'Join ShamFood')}
          </h2>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] space-y-1">
            {isLogin 
              ? <p>Delicious meals are waiting</p>
              : (otpStep ? <p>Enter code sent to {phone}</p> : <p>Start your food journey</p>)
            }
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin ? (
              <motion.div 
                key="register-fields"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {!otpStep ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
                        <input 
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">WhatsApp Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
                        <input 
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ex: 03001234567"
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 ml-1 uppercase tracking-widest">Verification code will be sent to {email || 'your email'}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Enter 6-Digit Code</label>
                    <div className="relative group text-center space-y-4">
                      <input 
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="0 0 0 0 0 0"
                        className="w-full text-center text-3xl tracking-[0.5em] py-6 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all font-black text-orange-500"
                      />
                      {debugOtp && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Dev Mode OTP: {debugOtp}</p>
                        </div>
                      )}
                      <button 
                        type="button" 
                        onClick={() => setOtpStep(false)}
                        className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="login-fields"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email or Phone</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
                    <input 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email or WhatsApp Number"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-500/20 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
          >
            {loading ? (
              <span className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <div className="absolute top-0 left-0 w-2 h-full bg-white/20 -skew-x-12 -translate-x-4 group-hover:translate-x-80 transition-transform duration-700" />
                {isLogin ? <LogIn className="w-5 h-5" /> : (otpStep ? <CheckCircle2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                {isLogin ? 'Sign In Now' : (otpStep ? 'Verify & Register' : 'Continue to Verify')}
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setOtpStep(false);
              setDebugOtp('');
            }}
            className="px-8 py-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-sm"
          >
            {isLogin ? 'Create Account' : 'Sign In Instead'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
