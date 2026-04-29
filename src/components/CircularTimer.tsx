import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface CircularTimerProps {
  status: string;
  initialTimeInMinutes?: number;
}

const statusToMinutes = (status: string) => {
  switch (status) {
    case 'pending': return 30;
    case 'accepted': return 25;
    case 'preparing': return 20;
    case 'out_for_delivery': return 10;
    case 'delivered': return 0;
    case 'cancelled': return 0;
    default: return 30;
  }
};

export const CircularTimer: React.FC<CircularTimerProps> = ({ status }) => {
  const [timeLeft, setTimeLeft] = useState(statusToMinutes(status) * 60);

  useEffect(() => {
    setTimeLeft(statusToMinutes(status) * 60);
  }, [status]);

  useEffect(() => {
    if (timeLeft <= 0 || status === 'delivered' || status === 'cancelled') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status]);

  const minutesRemaining = Math.floor(timeLeft / 60);
  const secondsRemaining = timeLeft % 60;

  const totalPossible = 30 * 60;
  const progress = (timeLeft / totalPossible) * 100;

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-48 h-48 sm:w-64 sm:h-64">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            className="stroke-gray-100 fill-none"
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="45%"
            className="stroke-orange-500 fill-none"
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDasharray: "283 283", strokeDashoffset: 283 }}
            animate={{ 
              strokeDashoffset: (progress / 100) * 283,
              strokeDasharray: "283 283"
            }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {status === 'delivered' ? (
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-black text-green-600 block">Delivered</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Enjoy your meal!</span>
            </div>
          ) : status === 'cancelled' ? (
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-black text-red-500 block">Cancelled</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Order voided</span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-4xl sm:text-6xl font-black text-gray-900 tabular-nums">
                {minutesRemaining}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-gray-400 ml-1">min</span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Estimated Arrival</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
