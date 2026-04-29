import React, { useState, useEffect } from 'react';
import { Product, Category, Order } from '../types';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit3, Package, ShoppingBag, LayoutDashboard, Settings, Loader2, Check, X, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
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
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setCategories(categoriesRes.data);
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
    console.log('[DEBUG] handleDeleteProduct initiated for ID:', productId);
    if (productId === undefined || productId === null) {
      console.warn('[DEBUG] No productId provided to handleDeleteProduct');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this food item?');
    if (!confirmDelete) {
      console.log('[DEBUG] Delete cancelled by user');
      return;
    }

    try {
      console.log('[DEBUG] Executing api.delete for product:', productId);
      const response = await api.delete(`/products/${productId}`);
      console.log('[DEBUG] Delete successful:', response.data);
      toast.success(response.data.message || 'Deleted successfully');
      await fetchData();
    } catch (error: any) {
      console.error('[DEBUG] Product delete FAILED:', {
        productId,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMsg = error.response?.data?.message || error.message || 'Delete failed';
      toast.error(`Error: ${errorMsg}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    console.log('handleDeleteCategory called with:', categoryId);
    if (!categoryId) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this category?');
    if (!confirmDelete) return;

    try {
      console.log('Sending DELETE request for category:', categoryId);
      const response = await api.delete(`/categories/${categoryId.toString()}`);
      console.log('Delete category response:', response.data);
      toast.success('Category deleted successfully');
      await fetchData();
    } catch (error: any) {
      console.error('Delete error for category:', categoryId, error);
      toast.error(error.response?.data?.message || 'Category delete failed');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    console.log('[DEBUG] handleDeleteOrder initiated for ID:', orderId);
    if (!orderId) {
      console.warn('[DEBUG] No orderId provided to handleDeleteOrder');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this order history?');
    if (!confirmDelete) {
      console.log('[DEBUG] Delete cancelled by user');
      return;
    }

    try {
      console.log('[DEBUG] Executing api.delete for order:', orderId);
      const response = await api.delete(`/orders/${orderId}`);
      console.log('[DEBUG] Delete successful:', response.data);
      toast.success('Order removed successfully');
      await fetchData();
    } catch (error: any) {
      console.error('[DEBUG] Order delete FAILED:', {
        orderId,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMsg = error.response?.data?.message || error.message || 'Delete failed';
      toast.error(`Error: ${errorMsg}`);
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
        { label: 'Total Revenue', value: `$${orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0).toFixed(2)}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Active Orders', value: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length, icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Total Products', value: products.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Completed Orders', value: orders.filter(o => o.status === 'delivered').length, icon: Check, color: 'text-purple-600', bg: 'bg-purple-50' },
      ].map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
            {React.createElement(stat.icon as any, { className: 'w-6 h-6' })}
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 px-0 sm:px-4">
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
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap min-w-max lg:min-w-full ${
              activeTab === item.id 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
              : 'text-gray-500 hover:bg-white hover:text-gray-900 bg-gray-50/50 lg:bg-transparent'
            }`}
          >
            {React.createElement(item.icon as any, { className: 'w-5 h-5' })}
            <span className="text-sm lg:text-base">{item.label}</span>
          </button>
        ))}
      </aside>

      <div className="flex-1 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-3xl font-extrabold text-gray-900 capitalize">Manage {activeTab}</h2>
          {activeTab === 'products' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
              <Plus className="w-5 h-5" /> Add Product
            </button>
          )}
          {activeTab === 'categories' && (
            <button 
              onClick={() => setShowAddCategoryModal(true)}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
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
              <div className="space-y-4 lg:bg-white lg:rounded-3xl lg:border lg:border-gray-100 lg:shadow-sm lg:overflow-hidden">
                {/* Desktop Table View */}
                <table className="hidden lg:table w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Customer</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Items</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Address</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Total</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500 font-bold">{order.id.slice(0, 8)}...</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{(order as any).userName || 'N/A'}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{(order as any).userPhone || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{order.items.length} items</p>
                          <p className="text-[10px] text-gray-400">{order.items.map(i => i.title).join(', ').slice(0, 30)}...</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] text-gray-500 max-w-[150px] line-clamp-2">{order.address}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-gray-900">${order.total.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' :
                            order.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="preparing">Preparing</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 lg:hidden">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-tighter mb-1">#{order.id.slice(0, 8)}</p>
                          <h4 className="font-bold text-gray-900">{(order as any).userName || 'N/A'}</h4>
                          <p className="text-xs text-gray-500">{(order as any).userPhone || 'N/A'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' :
                          order.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="py-3 border-y border-gray-50 space-y-2">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Address</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{order.address}</p>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                          <p className="text-xl font-black text-gray-900">${order.total.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Actions</p>
                          <div className="flex items-center gap-2 justify-end">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="preparing">Preparing</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
                  <div key={product.id} className="bg-white rounded-3xl border border-gray-100 p-4 flex gap-4 group hover:border-orange-200 transition-all">
                    <img 
                      src={product.image} 
                      alt={product.title} 
                      className="w-20 h-20 rounded-2xl object-cover shadow-sm" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 leading-tight">{product.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {categories.find(c => c.id === product.categoryId)?.name || product.category || 'Uncategorized'}
                        </p>
                      </div>
                      <p className="font-black text-orange-600">${product.price.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col gap-2 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setShowEditModal(true);
                        }}
                        className="p-2 bg-gray-50 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 bg-gray-50 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map(category => (
                  <div key={category.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-orange-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-50 text-orange-500 p-3 rounded-2xl">
                        <Package className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-gray-900">{category.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingCategory(category);
                          setShowEditCategoryModal(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">Edit Food Item</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleEditProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Item Title</label>
                <input required value={editingProduct.title} onChange={e => setEditingProduct({...editingProduct, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Price ($)</label>
                <input required type="number" step="0.01" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                <select required value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Image URL</label>
                <input required value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24" />
              </div>
              <button type="submit" className="sm:col-span-2 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">Update Item</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">Edit Category</h3>
              <button onClick={() => setShowEditCategoryModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                <input required value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">Update Category</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">Add Category</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                <input required value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Italian" />
              </div>
              <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all">Add Category</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">Add New Food Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Item Title</label>
                <input required value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Pepperoni Pizza" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Price ($)</label>
                <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                <select required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Image URL</label>
                <input required value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="https://..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24" />
              </div>
              <button type="submit" className="sm:col-span-2 bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all">Create Item</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
