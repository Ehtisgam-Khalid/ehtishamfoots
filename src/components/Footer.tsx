import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 border-t border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand Section */}
        <div className="space-y-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-orange-500 p-2 rounded-xl">
              <Utensils className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">ShamFood</span>
          </Link>
          <p className="text-sm leading-relaxed text-gray-400">
            Bringing the best flavors from our kitchen straight to your doorstep. Quality ingredients, fast delivery, and authentic taste in every bite.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-500 hover:text-white transition-all">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-500 hover:text-white transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-500 hover:text-white transition-all">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-bold text-lg mb-6">Quick Links</h3>
          <ul className="space-y-4 text-sm">
            <li><Link to="/" className="hover:text-orange-500 transition-colors">Menu</Link></li>
            <li><Link to="/orders" className="hover:text-orange-500 transition-colors">My Orders</Link></li>
            <li><Link to="/cart" className="hover:text-orange-500 transition-colors">Shopping Cart</Link></li>
            <li><Link to="/auth" className="hover:text-orange-500 transition-colors">Sign In / Sign Up</Link></li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-white font-bold text-lg mb-6">Top Categories</h3>
          <ul className="space-y-4 text-sm">
            <li><Link to="/" className="hover:text-orange-500 transition-colors">BBQ Special</Link></li>
            <li><Link to="/" className="hover:text-orange-500 transition-colors">Desi Cuisine</Link></li>
            <li><Link to="/" className="hover:text-orange-500 transition-colors">Fast Food</Link></li>
            <li><Link to="/" className="hover:text-orange-500 transition-colors">Chinese Fusion</Link></li>
            <li><Link to="/" className="hover:text-orange-500 transition-colors">Sweet Desserts</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-white font-bold text-lg mb-6">Contact Us</h3>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
              <span>Bhittai Colony, Karachi, Pakistan</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-orange-500 shrink-0" />
              <span>+92 300 0000000</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-orange-500 shrink-0" />
              <span>info@shamfood.pk</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} ShamFood Food Delivery. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
