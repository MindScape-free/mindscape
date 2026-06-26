import React, { useRef, useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TextOverflowTooltipProps extends React.HTMLAttributes<HTMLElement> {
  text: string;
  className?: string;
  as?: React.ElementType;
}

export function TextOverflowTooltip({ text, className, as: Component = 'div', ...props }: TextOverflowTooltipProps) {
  const textRef = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const { clientWidth, scrollWidth, clientHeight, scrollHeight } = textRef.current;
        setIsOverflowing(scrollWidth > clientWidth || scrollHeight > clientHeight);
      }
    };

    checkOverflow();
    // Re-check on resize in case layout changes cause overflow
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  const content = (
    <Component ref={textRef} className={className} {...props}>
      {text}
    </Component>
  );

  if (!isOverflowing) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] break-words bg-black/90 text-zinc-100 border-white/10 shadow-2xl z-50 p-3 rounded-xl">
          <p className="text-sm font-medium leading-relaxed">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
