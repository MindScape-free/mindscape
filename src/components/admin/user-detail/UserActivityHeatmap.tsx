'use client';

import { format } from 'date-fns';
import {
  Map as MapIcon,
  Layers,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserActivityHeatmapProps {
  userActivity: any;
  userHeatmapMonth: Date;
}

export default function UserActivityHeatmap({ userActivity, userHeatmapMonth }: UserActivityHeatmapProps) {
  const year = userHeatmapMonth.getFullYear();
  const month = userHeatmapMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: { date: string; data: any; dateObj: Date }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    days.push({ date: dateStr, data: userActivity?.[dateStr], dateObj: d });
  }

  return (
    <>
      {days.map(({ date, data, dateObj }) => {
        const mapsCreated = data?.mapsCreated || data?.maps || 0;
        const imagesGenerated = data?.imagesGenerated || data?.images || 0;
        const nestedExpansions = data?.nestedExpansions || data?.expansions || data?.nested_expansions || 0;
        const studyTimeMinutes = data?.studyTimeMinutes || data?.study_minutes || 0;

        const totalActivity = mapsCreated + imagesGenerated + nestedExpansions + (studyTimeMinutes > 0 ? 1 : 0);
        const intensity = totalActivity === 0 ? 'bg-zinc-800' : totalActivity <= 2 ? 'bg-violet-900/60' : totalActivity <= 5 ? 'bg-violet-700/70' : totalActivity <= 10 ? 'bg-violet-500' : 'bg-violet-400';
        const isToday = format(today, 'yyyy-MM-dd') === date;
        const isFuture = dateObj > today;

        return (
          <Tooltip key={date}>
            <TooltipTrigger asChild>
              <div className={`aspect-square flex items-center justify-center rounded-sm ${intensity} hover:ring-2 hover:ring-violet-400/50 transition-all cursor-default ${isToday ? 'ring-2 ring-white/30' : ''} ${isFuture ? 'opacity-30' : ''}`}>
                <span className="text-[7px] text-white/70 font-bold">{format(new Date(date), 'd')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-[10px] font-bold p-3 min-w-[150px]">
              <p className="text-zinc-300 font-black mb-2 border-b border-zinc-700 pb-1">{format(new Date(date), 'EEEE, MMM d')}</p>
              <div className="space-y-1">
                <p className="text-blue-400 flex items-center gap-2"><MapIcon className="h-3 w-3" /> {mapsCreated} maps</p>
                <p className="text-purple-400 flex items-center gap-2"><Layers className="h-3 w-3" /> {nestedExpansions} sub-maps</p>
                <p className="text-pink-400 flex items-center gap-2"><ImageIcon className="h-3 w-3" /> {imagesGenerated} images</p>
                <p className="text-emerald-400 flex items-center gap-2"><Clock className="h-3 w-3" /> {studyTimeMinutes} min</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
