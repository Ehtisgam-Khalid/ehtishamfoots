import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { useTheme } from './contexts/ThemeContext';
import { Utensils, ShoppingCart, ShoppingBag, User } from 'lucide-react';
import { motion } from 'motion/react';

// Pages - We'll create these next
import Home from './pages/Home';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiresAdmin?: boolean }> = ({ children, requiresAdmin }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (requiresAdmin && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { items } = useCart();
  const { profile } = useAuth();
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-black font-sans antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/cart" element={<Cart />} />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders/:id" 
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiresAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      <Footer />
      
      {/* Modern Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex justify-between items-center pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Link to="/" className="flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className="p-1 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
            <Utensils className="w-6 h-6 text-orange-500" />
          </motion.div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Menu</span>
        </Link>
        <Link to="/cart" className="relative flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className="p-1 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
            <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </motion.div>
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-gray-900 shadow-sm animate-pulse">
              {items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Cart</span>
        </Link>
        <Link to="/orders" className="flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className="p-1 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
            <ShoppingBag className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </motion.div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Orders</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center gap-1 group">
          <motion.div whileTap={{ scale: 0.8 }} className="p-1 rounded-xl overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover ring-2 ring-transparent group-hover:ring-orange-500 transition-all" />
            ) : (
              <User className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            )}
          </motion.div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Me</span>
        </Link>
      </nav>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: profile?.id ? (theme === 'dark' ? '#111' : '#fff') : (theme === 'dark' ? '#111' : '#fff'),
            color: theme === 'dark' ? '#fff' : '#000',
            borderRadius: '1.5rem',
            padding: '1rem 1.5rem',
            fontWeight: 'bold',
            border: theme === 'dark' ? '1px solid #333' : '1px solid #f3f4f6',
          }
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
