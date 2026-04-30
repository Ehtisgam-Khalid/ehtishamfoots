import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Loader2, ShieldCheck } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatPrice } from '../lib/utils';

import { ReviewsList } from '../components/ReviewsList';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const categoryParam = queryParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories')
        ]);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      } catch (err) {
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter(product => {
    const categoryName = categories.find(c => c.id === product.categoryId)?.name || product.category;
    const matchesCategory = selectedCategory === 'All' || categoryName === selectedCategory;
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: Product) => {
    addItem(product);
    toast.success(`Added ${product.title} to cart`);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative h-56 sm:h-64 md:h-80 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
          alt="Premium Food Selection" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center px-6 md:px-12">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-1 md:mb-4 leading-tight"
          >
            Delicious Food,<br />Delivered Fast
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-200 text-xs sm:text-sm md:text-xl font-bold mb-4 md:mb-8 max-w-[200px] sm:max-w-[280px] md:max-w-none"
          >
            The best restaurants in your city at your door.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 md:gap-4"
          >
            <button 
              onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-orange-500 text-white px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl font-black hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 text-xs sm:text-sm md:text-base"
            >
              Order Now
            </button>
            
            {isAdmin && (
              <Link 
                to="/admin" 
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 md:px-10 py-3 md:py-4 rounded-2xl font-black hover:bg-white/20 transition-all active:scale-95 flex items-center gap-3 text-sm md:text-base invisible sm:visible shadow-xl"
              >
                <ShieldCheck className="w-5 h-5 text-purple-400" /> Admin
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <div id="menu" className="flex flex-col md:flex-row gap-6 items-center justify-between transition-all">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 w-5 h-5 transition-colors" />
          <input 
            type="text"
            placeholder="Search for your favorite food..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 dark:text-white rounded-3xl outline-none transition-all shadow-xl shadow-gray-100 dark:shadow-none font-bold"
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3 overflow-x-auto w-full md:w-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap min-w-max border-2 ${
              selectedCategory === 'All' 
              ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-100 dark:shadow-none' 
              : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-50 dark:border-gray-800 hover:border-orange-200'
            }`}
          >
            All Meals
          </button>
          {categories.map(category => (
            <button 
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap min-w-max border-2 ${
                selectedCategory === category.name 
                ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-100 dark:shadow-none' 
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-50 dark:border-gray-800 hover:border-orange-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-xs">Fetching menu...</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
          >
            {filteredProducts.map(product => (
              <motion.div 
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-orange-100 dark:hover:border-orange-500/30 transition-all hover:shadow-2xl hover:shadow-gray-100 dark:hover:shadow-none"
              >
                <div className="relative h-48 md:h-56 overflow-hidden">
                  <img 
                    src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-orange-600 dark:text-orange-400 font-black text-xs md:text-sm shadow-xl tabular-nums">
                    {formatPrice(product.price)}
                  </div>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black text-orange-500">
                      {categories.find(c => c.id === product.categoryId)?.name || product.category}
                    </span>
                    <h3 className="font-black text-xl text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors line-clamp-1">{product.title}</h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium line-clamp-2 min-h-[40px]">
                    {product.description || 'Crafted with premium ingredients for the ultimate taste experience.'}
                  </p>
                  <button 
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-orange-500 hover:text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
          <p className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-xs">No food items match your search.</p>
        </div>
      )}

      <ReviewsList />
    </div>
  );
};

export default Home;
