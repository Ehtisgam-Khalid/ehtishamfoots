import React, { useState, useEffect } from 'react';
import { Product, Order, Category } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, ShoppingBag, Package, Settings, Plus, 
  Trash2, Edit3, X, Check, CreditCard, Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../lib/utils';
import { io } from 'socket.io-client';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'orders' | 'categories'>('stats');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // New product form
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    title: '',
    price: 0,
    category: '',
    description: '',
    image: '',
    available: true
  });

  // New category form
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'Package' });

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/orders'),
        api.get('/categories')
      ]);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (err) {
      toast.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket listener for new orders
    const socket = io(window.location.origin);
    socket.emit('join_admin');
    
    socket.on('new_order', (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
      
      // Play bell sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => {
        console.warn('Audio play failed (interaction required):', e);
      });
      
      toast.success(`New Order #${newOrder.id.slice(0, 8).toUpperCase()} Received!`, {
        icon: '🔔',
        duration: 6000,
        position: 'top-right'
      });
    });

    return () => {
      socket.close();
    };
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', newProduct);
      toast.success('Product added successfully');
      setShowAddModal(false);
      setNewProduct({
        title: '',
        price: 0,
        category: '',
        description: '',
        image: '',
        available: true
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add product');
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.put(`/products/${editingProduct.id}`, editingProduct);
      toast.success('Product updated successfully');
      setShowEditModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const handleDeleteProduct = async (productId: string | number) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this food item?');
    if (!confirmDelete) return;

    try {
      const response = await api.delete(`/products/${productId}`);
      toast.success(response.data.message || 'Deleted successfully');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!categoryId) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this category?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/categories/${categoryId.toString()}`);
      toast.success('Category deleted successfully');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Category delete failed');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this order history?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Order removed successfully');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/categories', newCategory);
      toast.success('Category added successfully');
      setShowAddCategoryModal(false);
      setNewCategory({ name: '', icon: 'Package' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await api.put(`/categories/${editingCategory.id}`, editingCategory);
      toast.success('Category updated successfully');
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const StatsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'Total Revenue', value: formatPrice(orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0)), icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
        { label: 'Active Orders', value: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length, icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
        { label: 'Total Products', value: products.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        { label: 'Completed Orders', value: orders.filter(o => o.status === 'delivered').length, icon: Check, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
      ].map((stat, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
            {React.createElement(stat.icon as any, { className: 'w-6 h-6' })}
          </div>
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 px-0 sm:px-4 pb-20">
      {/* Sidebar Navigation */}
      <aside className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 lg:w-64 scrollbar-hide shrink-0">
        {[
          { id: 'stats', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'products', label: 'Products', icon: Package },
          { id: 'categories', label: 'Categories', icon: Settings },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all whitespace-nowrap min-w-max lg:min-w-full ${
              activeTab === item.id 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 dark:shadow-none' 
              : 'text-gray-500 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white bg-gray-50/50 dark:bg-gray-900/50 lg:bg-transparent'
            }`}
          >
            {React.createElement(item.icon as any, { className: 'w-5 h-5' })}
            <span className="text-sm lg:text-base uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </aside>

      <div className="flex-1 space-y-8 min-w-0">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white capitalize">Manage {activeTab}</h2>
          {activeTab === 'products' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
              <Plus className="w-5 h-5" /> Add Food
            </button>
          )}
          {activeTab === 'categories' && (
            <button 
              onClick={() => setShowAddCategoryModal(true)}
              className="w-full sm:w-auto bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
              <Plus className="w-5 h-5" /> Add Category
            </button>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'stats' && <StatsView />}
            
            {activeTab === 'orders' && (
              <div className="space-y-4 lg:bg-white lg:dark:bg-gray-900 lg:rounded-[2.5rem] lg:border lg:border-gray-100 lg:dark:border-gray-800 lg:shadow-sm lg:overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50 dark:border-gray-800">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Items</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Address</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-500 font-bold">#{order.id.slice(0, 8)}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-gray-900 dark:text-white">{(order as any).userName || 'N/A'}</p>
                            <p className="text-[10px] text-gray-400 font-black">{(order as any).userPhone || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-gray-900 dark:text-white">{order.items.length} items</p>
                            <p className="text-[10px] text-gray-400 font-bold">{order.items.map(i => i.title).join(', ').slice(0, 30)}...</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[200px] line-clamp-2 font-bold">{order.address}</p>
                          </td>
                          <td className="px-6 py-4 font-black text-gray-900 dark:text-white tabular-nums">{formatPrice(order.total)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900' :
                              order.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900' :
                              order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900' :
                              'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <select 
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                className="bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                              >
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="preparing">Preparing</option>
                                <option value="out_for_delivery">Out For delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button 
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-6 lg:hidden">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-50 dark:shadow-none space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 font-mono uppercase tracking-widest">#{order.id.slice(0, 8)}</p>
                          <h4 className="font-black text-lg text-gray-900 dark:text-white">{(order as any).userName || 'N/A'}</h4>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{(order as any).userPhone || 'N/A'}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900' :
                          order.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900' :
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900' :
                          'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="py-5 border-y border-gray-50 dark:border-gray-800 space-y-3">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Address</p>
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-400 leading-relaxed">{order.address}</p>
                      </div>

                      <div className="flex flex-col gap-6">
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Order Summary</p>
                          <p className="font-black text-2xl text-gray-900 dark:text-white tabular-nums">{formatPrice(order.total)}</p>
                          <p className="text-xs font-bold text-orange-500 mt-1">{order.items.length} items ordered</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Update Progress</p>
                          <div className="flex items-center gap-3">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="preparing">Preparing</option>
                              <option value="out_for_delivery">Out for delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-4 bg-red-50 dark:bg-red-950/50 text-red-500 rounded-2xl hover:bg-red-100 transition-all shadow-sm"
                            >
                              <Trash2 className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map(product => (
                  <div key={product.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 flex gap-6 group hover:border-orange-500/30 transition-all shadow-sm">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-md shrink-0">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="space-y-1">
                        <h4 className="font-black text-lg text-gray-900 dark:text-white line-clamp-1">{product.title}</h4>
                        <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest pl-1">
                          {categories.find(c => c.id === product.categoryId)?.name || product.category || 'Uncategorized'}
                        </p>
                      </div>
                      <p className="font-black text-xl text-gray-900 dark:text-white tabular-nums">{formatPrice(product.price)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setShowEditModal(true);
                        }}
                        className="p-3 bg-gray-50 dark:bg-gray-800 text-blue-500 hover:bg-blue-500 hover:text-white rounded-2xl transition-all active:scale-90"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-3 bg-gray-50 dark:bg-gray-800 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all active:scale-90"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map(category => (
                  <div key={category.id} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex justify-between items-center group hover:border-orange-500/30 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="bg-orange-50 dark:bg-orange-950/30 text-orange-500 p-4 rounded-2xl shadow-sm">
                        <Package className="w-6 h-6" />
                      </div>
                      <p className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-sm">{category.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingCategory(category);
                          setShowEditCategoryModal(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                      >
                        <Edit3 className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals with Dark Mode Support */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 max-w-2xl w-full shadow-3xl space-y-8 max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-800"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">Edit Meal</h3>
              <button onClick={() => setShowEditModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:rotate-90"><X className="w-8 h-8 dark:text-white" /></button>
            </div>
            <form onSubmit={handleEditProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Meal Name</label>
                <input required value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Price (PKR)</label>
                <input required type="number" step="0.01" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Category</label>
                <select required value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold appearance-none">
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Image Link</label>
                <input required value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Short Description</label>
                <textarea value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none resize-none h-32 dark:text-white font-bold shadow-inner" />
              </div>
              <button type="submit" className="sm:col-span-2 bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95">Update Menu Item</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 max-w-2xl w-full shadow-3xl space-y-8 max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-800"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">New Food Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:rotate-90"><X className="w-8 h-8 dark:text-white" /></button>
            </div>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">What is it called?</label>
                <input required value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold" placeholder="e.g. Masala Burger" theme-aware="true" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Price (PKR)</label>
                <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Food Category</label>
                <select required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold appearance-none">
                  <option value="">Choose...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Tasty Photo Image Link</label>
                <input required value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none dark:text-white font-bold" placeholder="https://..." />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Meal Description</label>
                <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 rounded-[1.5rem] outline-none resize-none h-32 dark:text-white font-bold shadow-inner" placeholder="Tell us about the ingredients..." />
              </div>
              <button type="submit" className="sm:col-span-2 bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95">Launch Food Item</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Category Modals updated for Dark Mode */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-[3rem] p-12 max-w-md w-full shadow-3xl space-y-8"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">Create Group</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"><X className="w-8 h-8 dark:text-white" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-3 block">Category Label</label>
                <input required value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-800 border-none rounded-[1.5rem] outline-none font-bold dark:text-white" placeholder="e.g. Desserts" />
              </div>
              <button type="submit" className="w-full bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95">Add Category</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
