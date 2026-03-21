
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MindflowMinimapProps {
    nodes: any[];
    width: number;
    height: number;
    zoom: number;
    offset: { x: number; y: number };
    setOffset: (offset: { x: number; y: number }) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

export const MindflowMinimap = ({
    nodes,
    width,
    height,
    zoom,
    offset,
    setOffset,
    containerRef
}: MindflowMinimapProps) => {
    if (!containerRef.current) return null;

    const MINIMAP_WIDTH = 200;
    const padding = 10;

    // Scale the minimap content to fit MINIMAP_WIDTH
    const scale = (MINIMAP_WIDTH - padding * 2) / width;
    const minimapHeight = height * scale + padding * 2;

    const viewportWidth = containerRef.current.clientWidth;
    const viewportHeight = containerRef.current.clientHeight;

    // Calculate viewport box in minimap coordinates
    // offset.x is where content (0,0) is relative to viewport top-left
    // So viewport top-left in content coordinates is (-offset.x / zoom)
    const vx = (-offset.x / zoom) * scale + padding;
    const vy = (-offset.y / zoom) * scale + padding;
    const vw = (viewportWidth / zoom) * scale;
    const vh = (viewportHeight / zoom) * scale;

    const handleMinimapClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left - padding;
        const clickY = e.clientY - rect.top - padding;

        // Target content center
        const targetX = (clickX / scale);
        const targetY = (clickY / scale);

        setOffset({
            x: (viewportWidth / 2) - targetX * zoom,
            y: (viewportHeight / 2) - targetY * zoom
        });
    };

    return (
        <div
            className="absolute bottom-6 left-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden select-none group/minimap transition-all duration-300 hover:bg-black/60"
            style={{ width: MINIMAP_WIDTH, height: minimapHeight }}
            onClick={handleMinimapClick}
        >
            <div className="absolute top-2 left-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest pointer-events-none group-hover/minimap:text-purple-400 transition-colors">
                Navigator
            </div>

            <div className="relative w-full h-full p-[10px]">
                {/* Simplified Nodes on Minimap */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className={cn(
                            "absolute rounded-sm",
                            node.type === 'root' ? "bg-purple-500" :
                                node.type === 'subtopic' ? "bg-indigo-400" :
                                    "bg-zinc-600"
                        )}
                        style={{
                            left: node.x * scale,
                            top: node.y * scale,
                            width: Math.max(node.width * scale, 4),
                            height: Math.max(node.height * scale, 2),
                            transform: 'translate(0, -50%)',
                            opacity: 0.6
                        }}
                    />
                ))}

                {/* Viewport Box */}
                <div
                    className="absolute border-2 border-purple-400/50 bg-purple-400/10 rounded-sm pointer-events-none transition-all duration-75"
                    style={{
                        left: vx,
                        top: vy,
                        width: Math.max(vw, 10),
                        height: Math.max(vh, 10)
                    }}
                />
            </div>
        </div>
    );
};
