import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu as MenuIcon, Utensils, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import { Category } from '../types';

export const Header: React.FC = () => {
  const { user, profile, isAdmin, logout } = useAuth();
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <header id="main-header" className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="bg-orange-500 p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <Utensils className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">ShamFood</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-orange-500 font-bold transition-colors">Menu</Link>
          
          <div className="relative group">
            <button 
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-orange-500 font-bold transition-colors cursor-pointer py-4"
            >
              Categories <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-full left-0 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl py-2 mt-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {categories.map(cat => (
                <Link 
                  key={cat.id}
                  to={`/?category=${cat.name}`}
                  className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-orange-600 transition-colors font-bold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/orders" className="text-gray-600 dark:text-gray-400 hover:text-orange-500 font-bold transition-colors">My Orders</Link>
          {isAdmin && (
             <Link 
               to="/admin" 
               className="px-4 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-bold text-sm border border-purple-100 dark:border-purple-800 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white transition-all shadow-sm"
             >
               Admin
             </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <Link to="/cart" className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <span className="font-bold text-sm text-gray-700">{profile?.name || user.email}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="px-5 py-2 bg-orange-500 text-white font-bold rounded-full hover:bg-orange-600 transition-all shadow-md active:scale-95 text-sm"
            >
              Sign In
            </Link>
          )}
          
          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link to="/" className="block text-lg font-bold text-gray-900 dark:text-white" onClick={() => setIsMobileMenuOpen(false)}>Menu</Link>
              
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Categories</p>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <Link 
                      key={cat.id}
                      to={`/?category=${cat.name}`}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Link to="/orders" className="block text-lg font-bold text-gray-900 dark:text-white" onClick={() => setIsMobileMenuOpen(false)}>My Orders</Link>
              {isAdmin ? (
                 <Link 
                   to="/admin" 
                   className="block text-lg font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-4 py-3 rounded-2xl border border-purple-100 dark:border-purple-800" 
                   onClick={() => setIsMobileMenuOpen(false)}
                 >
                   Admin Dashboard
                 </Link>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
