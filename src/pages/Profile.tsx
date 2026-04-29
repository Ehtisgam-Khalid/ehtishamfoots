import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Phone, Calendar, ShieldCheck, LogOut, Camera, Save, X as CloseIcon } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, profile, logout, setProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    avatar: profile?.avatar || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!user || !profile) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image too large (Max 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
        toast.success('Image selected! 📸');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.patch('/auth/profile', formData);
      setProfile(response.data);
      toast.success('Profile updated successfully! 🚀');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-50 dark:shadow-none overflow-hidden"
      >
        <div className="bg-orange-500 h-32 relative">
          <div className="absolute -bottom-12 left-8 p-1 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[1.8rem] flex items-center justify-center overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 p-2 bg-orange-600 text-white rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <Camera className="w-4 h-4" />
                <input 
                  type="text" 
                  className="hidden" 
                  placeholder="URL"
                />
              </label>
            )}
          </div>
        </div>
        
        <div className="pt-16 p-8 sm:p-10 space-y-8">
          {!isEditing ? (
            <>
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{profile.name}</h1>
                <span className={`inline-block mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  profile.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                }`}>
                  {profile.role}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Email Address</p>
                  <div className="flex items-center gap-3 py-3.5 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="font-bold text-gray-700 dark:text-gray-300">{profile.email}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Phone Number</p>
                  <div className="flex items-center gap-3 py-3.5 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="font-bold text-gray-700 dark:text-gray-300">{profile.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Joined On</p>
                  <div className="flex items-center gap-3 py-3.5 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      {profile.createdAt ? format(new Date(profile.createdAt), 'MMMM dd, yyyy') : 'Recently'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Account Status</p>
                  <div className="flex items-center gap-3 py-3.5 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <ShieldCheck className={`w-5 h-5 ${profile.verified ? 'text-green-500' : 'text-orange-500'}`} />
                    <span className="font-bold text-gray-700 dark:text-gray-300">{profile.verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex gap-4 w-full sm:w-auto">
                  <button 
                    onClick={logout}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 dark:hover:bg-red-950/30 px-8 py-4 rounded-2xl transition-all border border-red-100 dark:border-red-900"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>

                  {profile.role === 'admin' && (
                    <Link 
                      to="/admin"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 dark:shadow-none"
                    >
                      <ShieldCheck className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                </div>

                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto sm:ml-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-all active:scale-95"
                >
                  Edit Profile
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Edit Your Profile</h2>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Display Name</p>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</p>
                  <input 
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Profile Image</p>
                  <label className="flex flex-col items-center justify-center w-full h-32 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-all cursor-pointer">
                    {formData.avatar ? (
                      <div className="flex items-center gap-4 w-full">
                        <img src={formData.avatar} alt="Preview" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                        <span className="text-xs font-bold text-gray-500">Change Image</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="w-8 h-8 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500">Upload from Gallery</span>
                      </div>
                    )}
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 dark:border-gray-800 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <CloseIcon className="w-4 h-4" /> Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] px-8 py-4 bg-orange-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
