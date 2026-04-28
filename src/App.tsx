import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

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
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans antialiased text-gray-900">
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
      <Toaster position="bottom-right" />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
