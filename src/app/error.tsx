'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to your preferred error reporting service
    console.error('MindScape Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-xl">
      <div className="max-w-md w-full text-center space-y-8 relative">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full -z-10" />
        
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-xl shadow-red-500/5 animate-pulse">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                System Interrupt
            </h1>
            <p className="text-zinc-400 font-bold text-sm tracking-wide">
              An unexpected error occurred in MindScape.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 border border-red-500/10 text-left">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest">Technical Signature</p>
              <p className="text-sm font-mono text-zinc-300 break-all leading-relaxed">
                {error.digest || 'UNIDENTIFIED_STATE'}
              </p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">
                Refer to this signature when contacting system admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => reset()}
              className="h-12 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black tracking-tight flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <RefreshCcw className="h-4 w-4" />
              Attempt Reconstruction
            </Button>
            
            <div className="flex gap-3">
              <Link href="/" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold tracking-tight transition-transform active:scale-95"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Abort to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-relaxed">
            Automatic state recovery might fail in high-latency environments. <br />
            Please refresh the portal if issues persist.
        </p>
      </div>
    </div>
  );
}
