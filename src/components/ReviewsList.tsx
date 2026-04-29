import React, { useEffect, useState } from 'react';
import { Review } from '../types';
import api from '../services/api';
import { Star, Quote, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export const ReviewsList: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reviews').then(res => {
      setReviews(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {
      setReviews([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (reviews.length === 0) return null;

  return (
    <section className="py-20 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-100 dark:shadow-none overflow-hidden mt-20">
      <div className="max-w-7xl mx-auto px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white leading-tight">What Our <span className="text-orange-500">Foodies</span> Say</h2>
            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">Real reviews from our happy customers</p>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 px-6 py-3 rounded-full text-orange-600 dark:text-orange-400 font-black text-lg">
            <Star className="w-6 h-6 fill-orange-500" />
            4.9 / 5.0 Rating
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.slice(0, 6).map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-50 dark:bg-black/40 p-10 rounded-[2.5rem] relative group border border-transparent hover:border-orange-500/20 transition-all"
            >
              <Quote className="absolute top-8 right-10 w-12 h-12 text-gray-100 dark:text-gray-800 pointer-events-none group-hover:text-orange-500/10 transition-colors" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < review.rating ? 'fill-orange-500 text-orange-500' : 'text-gray-200 dark:text-gray-800'}`} 
                  />
                ))}
              </div>

              <p className="text-gray-700 dark:text-gray-300 font-bold leading-relaxed mb-8 italic">
                "{review.comment}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-200 dark:shadow-none">
                  {review.userName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">{review.userName}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {format(new Date(review.createdAt), 'MMM yyyy')} • Verified Diner
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
