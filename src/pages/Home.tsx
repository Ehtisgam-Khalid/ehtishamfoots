import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Loader2, ShieldCheck } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

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
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
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
      <section className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-2xl">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
          alt="Premium Food Selection" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center px-6 md:px-12">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl md:text-5xl font-extrabold text-white mb-2 md:mb-4 leading-tight"
          >
            Delicious Food,<br />Delivered Fast
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-200 text-sm md:text-xl font-medium mb-4 md:mb-8 max-w-[280px] md:max-w-none"
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
              className="bg-orange-500 text-white px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95 text-sm md:text-base"
            >
              Order Now
            </button>
            
            {isAdmin && (
              <Link 
                to="/admin" 
                className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold hover:bg-white/30 transition-all active:scale-95 flex items-center gap-2 text-sm md:text-base"
              >
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-purple-300" /> Admin
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search for your favorite food..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-6 py-2.5 rounded-2xl font-semibold transition-all whitespace-nowrap min-w-max ${
              selectedCategory === 'All' 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            All Meals
          </button>
          {categories.map(category => (
            <button 
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-6 py-2.5 rounded-2xl font-semibold transition-all whitespace-nowrap min-w-max ${
                selectedCategory === category.name 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
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
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Fetching menu...</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredProducts.map(product => (
              <motion.div 
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-orange-200 transition-all hover:shadow-xl hover:shadow-orange-100/50"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000'} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-orange-600 font-bold text-sm shadow-sm">
                    ${product.price.toFixed(2)}
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">{product.title}</h3>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                      {categories.find(c => c.id === product.categoryId)?.name || product.category}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2 min-h-[40px]">
                    {product.description || 'No description available.'}
                  </p>
                  <button 
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all group-active:scale-95"
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
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">No results found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
