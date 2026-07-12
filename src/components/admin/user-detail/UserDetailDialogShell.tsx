'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface UserDetailDialogShellProps {
  children: ReactNode;
  onClose: () => void;
}

export default function UserDetailDialogShell({ children, onClose }: UserDetailDialogShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 lg:p-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-[#09090b]/90 max-w-6xl w-full h-[85vh] rounded-[2.5rem] overflow-hidden text-white flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.6)] border border-white/10 backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />
        {children}
      </motion.div>
    </motion.div>
  );
}
