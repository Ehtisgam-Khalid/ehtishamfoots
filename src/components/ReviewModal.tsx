import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, orderId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        orderId,
        rating,
        comment
      });
      toast.success('Review posted! Thanks for your feedback.', {
        icon: '🍱',
        position: 'bottom-center'
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to post review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="review-modal-overlay" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 max-w-lg w-full shadow-3xl space-y-8 relative overflow-hidden border border-white/20 dark:border-gray-800"
          >
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-90"
            >
              <X className="w-6 h-6 dark:text-white" />
            </button>

            <div className="text-center space-y-3">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">Rate Your Experience</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">How was your meal in order #{orderId.slice(0, 8)}?</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 transition-all active:scale-90"
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        s <= rating 
                        ? 'fill-orange-500 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]' 
                        : 'text-gray-200 dark:text-gray-800'
                      }`} 
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Your Feedback
                </label>
                <textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked (or what we can improve)..."
                  className="w-full p-6 bg-gray-50 dark:bg-black/40 border-2 border-transparent focus:border-orange-500 dark:text-white rounded-[2rem] outline-none transition-all font-bold text-sm min-h-[120px] resize-none shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Share Feedback'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
