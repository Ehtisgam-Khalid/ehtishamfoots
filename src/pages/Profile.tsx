import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Phone, Calendar, ShieldCheck, LogOut } from 'lucide-react';
import { format } from 'date-fns';

const Profile: React.FC = () => {
  const { user, profile, logout } = useAuth();

  if (!user || !profile) return null;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 overflow-hidden"
      >
        <div className="bg-orange-500 h-32 relative">
          <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-[2rem] shadow-xl">
            <div className="w-24 h-24 bg-gray-100 rounded-[1.8rem] flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="pt-16 p-10 space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{profile.name}</h1>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              profile.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {profile.role}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</p>
              <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-700">{profile.email}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</p>
              <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-700">{profile.phone || 'Not provided'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Joined On</p>
              <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-700">
                  {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM dd, yyyy') : 'Recently'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Status</p>
              <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl">
                <ShieldCheck className={`w-5 h-5 ${profile.verified ? 'text-green-500' : 'text-orange-500'}`} />
                <span className="font-semibold text-gray-700">{profile.verified ? 'Verified' : 'Unverified'}</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-50 flex flex-wrap gap-4 justify-between items-center">
            <div className="flex gap-4">
              <button 
                onClick={logout}
                className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-6 py-3 rounded-2xl transition-all"
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>

              {profile.role === 'admin' && (
                <Link 
                  to="/admin"
                  className="flex items-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                >
                  <ShieldCheck className="w-5 h-5" /> Admin Dashboard
                </Link>
              )}
            </div>

            <button className="bg-gray-100 text-gray-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all">
              Edit Profile
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
