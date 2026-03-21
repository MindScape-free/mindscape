'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, MoreHorizontal, ChevronRight, Share2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerateMindMapOutput } from '@/ai/flows/generate-mind-map';

interface BreadcrumbNavigationProps {
  maps: GenerateMindMapOutput[];
  activeIndex: number;
  onSelect: (index: number) => void;
  isBusy?: boolean;
  className?: string;
}

export function BreadcrumbNavigation({
  maps,
  activeIndex,
  onSelect,
  isBusy = false,
  className,
}: BreadcrumbNavigationProps) {
  // Only show what's in our current navigation history
  const history = maps.slice(0, activeIndex + 1);

  // Smart collapse: if history is long, hide middle steps
  const maxItems = 3;
  const isCollapsed = history.length > maxItems;

  const renderBreadcrumb = (index: number) => {
    const map = maps[index];
    const isActive = index === activeIndex;

    return (
      <div
        key={index}
        className={cn(
          "relative flex items-center group transition-all duration-300",
          isActive ? "z-10" : "z-0",
          isBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
        onClick={() => !isBusy && onSelect(index)}
      >
        <div className={cn(
          "px-4 py-1.5 rounded-full flex items-center gap-2 text-sm backdrop-blur-md transition-all duration-500",
          isActive
            ? "bg-purple-600/20 text-white font-bold ring-1 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-gradient-to-r from-purple-600/20 to-blue-600/10"
            : "bg-white/5 text-zinc-400 font-medium hover:bg-white/10 hover:text-zinc-200 ring-1 ring-white/5"
        )}>
          {index === 0 ? (
            <Sparkles className={cn("h-3.5 w-3.5", isActive ? "text-purple-400" : "text-zinc-500")} />
          ) : (
            <Brain className={cn("h-3.5 w-3.5", isActive ? "text-purple-400" : "text-zinc-500")} />
          )}
          <span>{map.topic}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {history.map((_, index) => {
        // Handle dividers
        const separator = index > 0 && (
          <div className="flex items-center justify-center w-6 h-6 -mx-1 opacity-40">
            <div className="w-4 h-[1px] bg-gradient-to-r from-zinc-700 to-transparent" />
            <div className="absolute w-1 h-1 rounded-full bg-zinc-600" />
          </div>
        );

        // Logic for collapsed view
        if (isCollapsed && index > 0 && index < history.length - 1) {
          if (index === 1) {
            return (
              <React.Fragment key="collapsed">
                {separator}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isBusy}
                      className="h-8 w-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 text-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-zinc-950/90 border-white/10 backdrop-blur-xl">
                    {history.slice(1, -1).map((m, i) => (
                      <DropdownMenuItem
                        key={i}
                        className="text-zinc-300 focus:text-white focus:bg-white/5 gap-2"
                        onSelect={() => onSelect(i + 1)}
                      >
                        <Brain className="h-3 w-3 text-purple-400" />
                        {m.topic}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </React.Fragment>
            );
          }
          return null;
        }

        return (
          <React.Fragment key={index}>
            {separator}
            {renderBreadcrumb(index)}
          </React.Fragment>
        );
      })}
    </div>
  );
}
