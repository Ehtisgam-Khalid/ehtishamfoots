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
  const progress = Math.max(0, Math.min(1, (totalPossible - timeLeft) / totalPossible));
  const dashArray = 282.7;
  const dashOffset = dashArray * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-56 h-56 sm:w-72 sm:h-72">
        {/* Background Reflection/Glow */}
        <div className="absolute inset-4 rounded-full bg-gray-50 dark:bg-gray-800/30 blur-2xl opacity-50" />
        
        {/* SVG Circle */}
        <svg 
          className="w-full h-full transform -rotate-90 drop-shadow-2xl"
          viewBox="0 0 100 100"
        >
          {/* Subtle Outer Track */}
          <circle
            cx="50"
            cy="50"
            r="48"
            className="stroke-gray-50 dark:stroke-gray-800/50 fill-none"
            strokeWidth="1"
          />
          {/* Main Track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            className="stroke-gray-100 dark:stroke-gray-800 fill-none"
            strokeWidth="6"
          />
          {/* Progress Circle with Glow */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            className="stroke-orange-500 fill-none"
            strokeWidth="6"
            strokeLinecap="round"
            initial={{ strokeDasharray: dashArray, strokeDashoffset: dashArray }}
            animate={{ 
              strokeDashoffset: dashOffset
            }}
            transition={{ duration: 1.5, ease: 'circOut' }}
          />
          
          {/* Indicator Dot at the tip of progress */}
          {progress > 0 && progress < 1 && (
            <motion.circle
              cx={50 + 45 * Math.cos((progress * 360 * Math.PI) / 180)}
              cy={50 + 45 * Math.sin((progress * 360 * Math.PI) / 180)}
              r="3"
              className="fill-orange-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            />
          )}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="bg-white dark:bg-gray-900 w-4/5 h-4/5 rounded-full shadow-inner flex flex-col items-center justify-center border border-gray-50 dark:border-gray-800">
            {status === 'delivered' ? (
              <div className="text-center px-4">
                <span className="text-3xl sm:text-4xl font-black text-green-600 block leading-tight">Arrived!</span>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enjoy</span>
                </div>
              </div>
            ) : status === 'cancelled' ? (
              <div className="text-center px-4">
                <span className="text-3xl sm:text-4xl font-black text-red-500 block">Voided</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Order Cancelled</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl sm:text-7xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                    {minutesRemaining}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-gray-400 dark:text-gray-500 ml-1">min</span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em]">Estimated Arrival</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
