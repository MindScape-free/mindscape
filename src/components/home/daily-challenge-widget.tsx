'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, ArrowRight, CheckCircle2, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDailyChallenge, getTodayString } from '@/lib/daily-challenges';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClient } from '@/lib/supabase-db';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function DailyChallengeWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const today = getTodayString();
  const challenge = getDailyChallenge(today);

  useEffect(() => {
    async function checkCompletion() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_daily_challenges')
        .select('id')
        .eq('user_id', user.id)
        .eq('date_string', today)
        .maybeSingle();

      if (data) {
        setIsCompleted(true);
      }
      setIsLoading(false);
    }

    checkCompletion();
  }, [user, today]);

  const handleStart = () => {
    router.push(`/canvas?topic=${encodeURIComponent(challenge.topic)}&challenge=true`);
  };

  if (!user) return null; // Only show for logged in users

  return (
    <section className="py-8 relative w-full max-w-5xl mx-auto px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-3xl p-1",
          isCompleted ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20" : "bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-orange-500/20"
        )}
      >
        {/* Animated border effect */}
        {!isCompleted && (
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[bg-pan_3s_linear_infinite]" />
        )}
        
        <div className="relative bg-[#0A0A0A] rounded-[1.4rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
          
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
              isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white"
            )}>
              {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Target className="w-6 h-6" />}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-orbitron font-bold text-lg text-white">Daily Challenge</h3>
                {!isCompleted && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    +{challenge.xpReward} XP
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400">
                {isCompleted 
                  ? "You've conquered today's challenge. Come back tomorrow!" 
                  : "Generate a mind map for today's topic to earn bonus XP."}
              </p>
              <div className="mt-3 text-lg sm:text-xl font-semibold text-zinc-200">
                &ldquo;{challenge.topic}&rdquo;
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {isLoading ? (
              <div className="w-32 h-10 rounded-xl bg-white/5 animate-pulse" />
            ) : isCompleted ? (
              <Button disabled variant="outline" className="w-full sm:w-auto rounded-xl border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                Completed
              </Button>
            ) : (
              <Button 
                onClick={handleStart}
                className="w-full sm:w-auto group rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Challenge
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
          
        </div>
      </motion.div>
    </section>
  );
}
