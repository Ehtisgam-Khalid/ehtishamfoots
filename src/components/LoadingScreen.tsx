import React from 'react';
import { motion } from 'motion/react';
import { UtensilsCrossed } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-black overflow-hidden">
      {/* Background Decorative Blobs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-200/20 dark:bg-orange-900/10 blur-[100px] rounded-full"
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-100/20 dark:bg-orange-800/10 blur-[120px] rounded-full"
      />

      {/* Main Container */}
      <div className="relative flex flex-col items-center">
        {/* 3D-style Dish Icon Container */}
        <div className="relative perspective-1000">
          <motion.div
            animate={{ 
              rotateY: [0, 360],
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] border-b-8 border-r-4 border-orange-700 relative z-10"
          >
            <UtensilsCrossed className="w-16 h-16 text-white drop-shadow-lg" />
          </motion.div>
          
          {/* Shadow below the icon */}
          <motion.div 
            animate={{ 
              scale: [1, 0.6, 1],
              opacity: [0.4, 0.2, 0.4]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-4 bg-black/10 dark:bg-white/5 blur-md rounded-full mt-8 mx-auto"
          />
        </div>

        {/* Text Content */}
        <div className="mt-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight"
          >
            Welcome to <span className="text-orange-500">Sham Food</span>
          </motion.h1>
          
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
                className="w-1.5 h-1.5 bg-orange-500 rounded-full"
              />
            ))}
          </div>
          <p className="mt-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Preparing the flavor</p>
        </div>
      </div>

      {/* Decorative lines */}
      <div className="absolute bottom-10 left-0 right-0 overflow-hidden opacity-10 flex justify-center gap-20">
         <div className="w-px h-20 bg-orange-500" />
         <div className="w-px h-20 bg-orange-500" />
         <div className="w-px h-20 bg-orange-500" />
      </div>
    </div>
  );
};
