
'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { MindMapData, SubCategory } from '@/types/mind-map';
import { cn, toPascalCase } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loader2, ZoomIn, ZoomOut, Move, Plus, Minus, Search, Target, Zap, Info, ArrowRight, MessageSquare, Lightbulb, GraduationCap, PenTool, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MindflowMinimap } from './mindflow-minimap';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

// --- Types ---

interface NodePosition {
    id: string;
    x: number;
    y: number;
    data: any;
    type: 'root' | 'subtopic' | 'category' | 'subcategory';
    parentId?: string;
    width: number;
    height: number;
}

interface Connection {
    id: string;
    sourceId: string;
    targetId: string;
    path: string;
}

interface MindMapRadialViewProps {
    data: MindMapData;
    onNodeClick?: (node: any) => void;
    onGenerateNewMap: (topic: string, parentTopic?: string) => void;
    generatingNode?: string | null;
    onExplainInChat?: (message: string) => void;
    onExplainWithExample?: (topic: string, description: string) => void;
    onStartQuiz?: (topic: string) => void;
    onPracticeClick?: (topic: string) => void;
    onGenerateImage?: (topic: string, parentTopic?: string) => void;
}

// --- Constants (Tuning Knobs) ---

const ROOT_WIDTH = 240;
const ROOT_HEIGHT = 80;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const LEAF_WIDTH = 180;
const LEAF_HEIGHT = 50;

const H_SPACING = 350; // Horizontal gap between tiers
const V_SPACING = 30;  // Vertical gap between siblings
const ROOT_X = 100;    // Starting X

// --- Layout Engine (Pure & Deterministic) ---

/**
 * Calculates the bounding box height of a node and its children recursively.
 * This ensures parents are centered relative to their children.
 */
const calculateSubtreeHeight = (
    node: any,
    type: 'subtopic' | 'category' | 'subcategory',
    collapsedNodes: Set<string>,
    nodePath: string
): number => {
    if (collapsedNodes.has(nodePath)) return type === 'subcategory' ? LEAF_HEIGHT : NODE_HEIGHT;

    let children: any[] = [];
    let childType: 'category' | 'subcategory' | null = null;
    let nodeHeight = 0;

    if (type === 'subtopic') {
        children = node.categories || [];
        childType = 'category';
        nodeHeight = NODE_HEIGHT;
    } else if (type === 'category') {
        children = node.subCategories || [];
        childType = 'subcategory';
        nodeHeight = NODE_HEIGHT;
    } else {
        return LEAF_HEIGHT; // Leaf nodes have fixed height
    }

    if (children.length === 0) return nodeHeight;

    const childrenHeight = children.reduce((acc, child, idx) => {
        const childPath = type === 'subtopic' ? `${nodePath}-cat-${idx}` : `${nodePath}-sub-${idx}`;
        return acc + calculateSubtreeHeight(child, childType as any, collapsedNodes, childPath);
    }, 0);
    const spacingHeight = (children.length - 1) * V_SPACING;

    // The subtree height is the max of the node itself or its expanded children
    return Math.max(nodeHeight, childrenHeight + spacingHeight);
};

const LayoutEngine = (data: MindMapData, collapsedNodes: Set<string>) => {
    const nodes: NodePosition[] = [];
    const connections: Connection[] = [];

    // 1. Place Root
    const rootNode: NodePosition = {
        id: 'root',
        x: ROOT_X,
        y: 0,
        data: { label: data.topic, icon: data.icon },
        type: 'root',
        width: ROOT_WIDTH,
        height: ROOT_HEIGHT
    };
    nodes.push(rootNode);

    // 2. Recursive Placement
    let currentY = 0;

    // Process SubTopics (Level 1)
    if (data.mode === 'single') {
        (data.subTopics || []).forEach((st, stIdx) => {
            const stId = `st-${stIdx}`;
            const stHeight = calculateSubtreeHeight(st, 'subtopic', collapsedNodes, stId);
            const stY = currentY + stHeight / 2;

            const stNode: NodePosition = {
                id: stId,
                x: ROOT_X + H_SPACING,
                y: stY,
                data: { label: st.name, icon: st.icon },
                type: 'subtopic',
                parentId: 'root',
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            };
            nodes.push(stNode);

            if (collapsedNodes.has(stId)) {
                currentY += stHeight + V_SPACING;
                return;
            }

            // Process Categories (Level 2)
            let catCurrentY = currentY;

            (st.categories || []).forEach((cat, catIdx) => {
                const catId = `${stId}-cat-${catIdx}`;
                const catHeight = calculateSubtreeHeight(cat, 'category', collapsedNodes, catId);
                const catY = catCurrentY + catHeight / 2;

                const catNode: NodePosition = {
                    id: catId,
                    x: ROOT_X + H_SPACING * 2,
                    y: catY,
                    data: { label: cat.name, icon: cat.icon },
                    type: 'category',
                    parentId: stId,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT
                };
                nodes.push(catNode);

                if (collapsedNodes.has(catId)) {
                    catCurrentY += catHeight + V_SPACING;
                    return;
                }

                // Process SubCategories (Level 3 - Leaves)
                let subCatCurrentY = catCurrentY;
                (cat.subCategories || []).forEach((subCat, scIdx) => {
                    const subCatId = `${catId}-sub-${scIdx}`;
                    const subCatHeight = LEAF_HEIGHT;
                    const subCatY = subCatCurrentY + subCatHeight / 2;

                    const subCatNode: NodePosition = {
                        id: subCatId,
                        x: ROOT_X + H_SPACING * 3,
                        y: subCatY,
                        data: { label: subCat.name, ...subCat },
                        type: 'subcategory',
                        parentId: catId,
                        width: LEAF_WIDTH,
                        height: LEAF_HEIGHT
                    };
                    nodes.push(subCatNode);

                    subCatCurrentY += subCatHeight + V_SPACING;
                });

                if (cat.subCategories.length === 0) {
                    catCurrentY += catHeight + V_SPACING;
                } else {
                    catCurrentY = subCatCurrentY;
                }
            });

            if (st.categories.length === 0) {
                currentY += stHeight + V_SPACING;
            } else {
                currentY = catCurrentY;
            }
        });
    }

    const totalTreeHeight = currentY;

    // 3. Center Everything Vertically
    // We want the average Y of all nodes to be approx screen center, 
    // but easier: just shift root to calculate mid Y of the tree.
    // Actually, root should be at `totalTreeHeight / 2`.

    rootNode.y = totalTreeHeight / 2;

    // 4. Generate Connections (Bézier Curves)
    nodes.forEach(node => {
        if (node.parentId) {
            const parent = nodes.find(n => n.id === node.parentId);
            if (parent) {
                // Attach right of parent to left of child
                const sourceX = parent.x + parent.width;
                const sourceY = parent.y; // Center
                const targetX = node.x;
                const targetY = node.y;   // Center

                // Bézier Control Points
                // Control point 1: Halfway horizontal, same Y as source
                // Control point 2: Halfway horizontal, same Y as target
                const midX = (sourceX + targetX) / 2;

                const path = `
                    M ${sourceX} ${sourceY}
                    C ${midX} ${sourceY},
                      ${midX} ${targetY},
                      ${targetX} ${targetY}
                `;

                connections.push({
                    id: `e-${parent.id}-${node.id}`,
                    sourceId: parent.id,
                    targetId: node.id,
                    path
                });
            }
        }
    });

    return { nodes, connections, width: ROOT_X + H_SPACING * 4, height: totalTreeHeight };
};

// --- Components ---

export const MindMapRadialView = React.memo(({
    data,
    onNodeClick,
    onGenerateNewMap,
    generatingNode,
    onExplainInChat,
    onExplainWithExample,
    onStartQuiz,
    onPracticeClick,
    onGenerateImage
}: MindMapRadialViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);

    const { nodes, connections, width, height } = useMemo(() => LayoutEngine(data, collapsedNodes), [data, collapsedNodes]);

    // Viewport culling: only render nodes/connections visible on screen
    const visibleNodes = useMemo(() => {
        if (!containerRef.current) return nodes;
        const cw = containerRef.current.clientWidth || 1400;
        const ch = containerRef.current.clientHeight || 900;
        const pad = 200; // padding in world-space units
        const viewLeft = (-offset.x / zoom) - pad;
        const viewTop = (-offset.y / zoom) - pad;
        const viewRight = viewLeft + (cw / zoom) + pad * 2;
        const viewBottom = viewTop + (ch / zoom) + pad * 2;
        return nodes.filter(n => {
            const nx = n.x;
            const ny = n.y - n.height / 2;
            return nx + n.width >= viewLeft && nx <= viewRight && ny + n.height >= viewTop && ny <= viewBottom;
        });
    }, [nodes, offset, zoom]);

    const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

    const visibleConnections = useMemo(() => {
        return connections.filter(c => visibleNodeIds.has(c.sourceId) || visibleNodeIds.has(c.targetId));
    }, [connections, visibleNodeIds]);

    // Level of detail: simplify rendering when zoomed out
    const isLowDetail = zoom < 0.6;

    const filteredNodes = useMemo(() => {
        if (!searchQuery) return [];
        return nodes.filter(n => n.data.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [nodes, searchQuery]);

    const toggleCollapse = (nodeId: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    };

    // Initial Center and Zoom
    useEffect(() => {
        if (containerRef.current) {
            const clientH = containerRef.current.clientHeight;
            // Tree content ranges from Y=0 to Y=height
            // We want (height/2) * zoom + offsetY = clientH / 2
            const initialY = (clientH / 2) - (height / 2) * zoom;
            setOffset({ x: 50, y: initialY });
        }
    }, [height]); // Run once on mount/height change (ignore zoom to prevent drift)

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(z => Math.min(Math.max(z * delta, 0.4), 2));
        } else {
            // Pan
            setOffset(o => ({ ...o, x: o.x - e.deltaX, y: o.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const zoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
    const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4));
    const resetZoom = () => {
        setZoom(1);
        if (containerRef.current) {
            const clientH = containerRef.current.clientHeight;
            const initialY = (clientH / 2) - (height / 2); // Reset to 1x zoom centering
            setOffset({ x: 50, y: initialY });
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-zinc-950/95 relative overflow-hidden cursor-grab active:cursor-grabbing group"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setFocusedNodeId(null)}
        >
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`
                }}
            />

            {/* Transform Container */}
            <div
                className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`
                }}
            >
                <svg width={width} height={height} className="overflow-visible pointer-events-none">
                    <defs>
                        <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <AnimatePresence>
                        {visibleConnections.map(conn => {
                            const isFocusedPath = focusedNodeId && (conn.sourceId === focusedNodeId || conn.targetId === focusedNodeId);
                            const isDimmed = focusedNodeId && !isFocusedPath;

                            return (
                                <React.Fragment key={conn.id}>
                                    {isLowDetail ? (
                                        <path
                                            d={conn.path}
                                            fill="none"
                                            stroke={isDimmed ? 'rgba(168,85,247,0.05)' : 'rgba(168,85,247,0.4)'}
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                    ) : (
                                        <motion.path
                                            initial={{ opacity: 0, pathLength: 0 }}
                                            animate={{
                                                opacity: isDimmed ? 0.1 : 1,
                                                pathLength: 1,
                                                stroke: isFocusedPath ? '#a855f7' : "url(#link-gradient)"
                                            }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            d={conn.path}
                                            fill="none"
                                            strokeWidth={isFocusedPath ? "3" : "2"}
                                            strokeLinecap="round"
                                            className={cn(
                                                "drop-shadow-[0_0_2px_rgba(168,85,247,0.3)]",
                                                isFocusedPath && "filter-[url(#glow)]"
                                            )}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </AnimatePresence>
                </svg>

                <AnimatePresence>
                    {visibleNodes.map(node => {
                        const Icon = (LucideIcons as any)[toPascalCase(node.data.icon || 'circle')] || LucideIcons.Circle;
                        const isLeaf = node.type === 'subcategory';
                        const isCollapsed = collapsedNodes.has(node.id);
                        const isFocused = focusedNodeId === node.id;
                        const isDimmed = focusedNodeId && !isFocused && node.id !== 'root'; // Root usually stays visible

                        return (
                            <motion.div
                                key={node.id}
                                layoutId={node.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: isDimmed ? 0.2 : 1,
                                    scale: 1,
                                    left: node.x,
                                    top: node.y,
                                    borderColor: isFocused || (searchQuery && node.data.label.toLowerCase().includes(searchQuery.toLowerCase())) ? 'rgba(168, 85, 247, 0.8)' : undefined,
                                    boxShadow: isFocused ? '0 0 20px rgba(168, 85, 247, 0.3)' : (searchQuery && node.data.label.toLowerCase().includes(searchQuery.toLowerCase())) ? '0 0 15px rgba(168, 85, 247, 0.2)' : undefined
                                }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className={cn(
                                    "absolute flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg transition-all duration-200 select-none",
                                    "max-w-[260px] min-w-[150px] whitespace-normal break-words leading-snug",
                                    node.type === 'root' ? "bg-gradient-to-br from-purple-600 to-indigo-700 border-white/20 text-white shadow-purple-500/20 z-30" :
                                        node.type === 'subtopic' ? "bg-zinc-900 border-indigo-500/30 text-zinc-100 shadow-indigo-500/10 z-20" :
                                            node.type === 'category' ? "bg-zinc-900/80 border-blue-500/30 text-zinc-300 shadow-blue-500/5 z-10" :
                                                "bg-zinc-900/50 border-teal-500/20 text-zinc-400 hover:border-purple-500/40 hover:text-white hover:bg-zinc-800 shadow-teal-500/5 z-10 cursor-pointer"
                                )}
                                style={{
                                    transform: 'translate(0, -50%)',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNode(node);
                                }}
                            >
                                {/* Expansion Button */}
                                {!isLeaf && node.type !== 'root' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCollapse(node.id);
                                        }}
                                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center border-2 border-zinc-950 shadow-lg hover:scale-110 transition-transform z-50"
                                    >
                                        {isCollapsed ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                    </button>
                                )}

                                <div className={cn(
                                    "flex items-center justify-center rounded-lg flex-shrink-0 relative",
                                    node.type === 'root' ? "bg-white/20 p-2" :
                                        isLeaf ? "bg-white/5 p-1.5" :
                                            "bg-white/10 p-2"
                                )}>
                                    <Icon className={cn(
                                        node.type === 'root' ? "w-6 h-6" : "w-4 h-4"
                                    )} />
                                    {isFocused && (
                                        <div className="absolute inset-0 rounded-lg border-2 border-purple-400 animate-ping opacity-50" />
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0 pr-6">
                                    <span className={cn(
                                        "block font-orbitron",
                                        node.type === 'root' ? "text-xl font-bold tracking-tight" :
                                            node.type === 'subtopic' ? "text-sm font-bold uppercase tracking-wide" :
                                                "text-xs font-medium"
                                    )}>
                                        {node.data.label}
                                    </span>
                                    {isLeaf && generatingNode === node.data.name && (
                                        <span className="text-[9px] text-purple-400 flex items-center gap-1 animate-pulse">
                                            <Loader2 className="w-2 h-2 animate-spin" />
                                            Wait...
                                        </span>
                                    )}
                                </div>

                                {/* Focus/Target Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFocusedNodeId(isFocused ? null : node.id);
                                    }}
                                    className={cn(
                                        "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
                                        isFocused ? "text-purple-400 bg-purple-400/10" : "text-zinc-600 hover:text-purple-400 hover:bg-white/5"
                                    )}
                                >
                                    <Target className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Controls Overlay - Top Right */}
            <div className="absolute top-6 right-6 flex flex-col gap-2 z-50">
                <button onClick={zoomIn} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-purple-500/20 hover:border-purple-500/40 backdrop-blur-md transition-all flex items-center justify-center font-bold text-lg">
                    +
                </button>
                <button onClick={zoomOut} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-purple-500/20 hover:border-purple-500/40 backdrop-blur-md transition-all flex items-center justify-center font-bold text-lg">
                    −
                </button>
                <button onClick={resetZoom} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-purple-500/20 hover:border-purple-500/40 backdrop-blur-md transition-all flex items-center justify-center">
                    <Move className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={cn(
                        "w-10 h-10 rounded-xl border backdrop-blur-md transition-all flex items-center justify-center",
                        isSearchOpen ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-white/5 border-white/10 text-white hover:bg-purple-500/20 hover:border-purple-500/40"
                    )}
                >
                    <Search className="w-4 h-4" />
                </button>
            </div>

            {/* Search Overlay */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
                    >
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all shadow-2xl"
                            />
                            {searchQuery && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto no-scrollbar">
                                    {filteredNodes.length > 0 ? (
                                        filteredNodes.map(node => (
                                            <div
                                                key={node.id}
                                                className="px-4 py-3 hover:bg-purple-500/20 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                                                onClick={() => {
                                                    setFocusedNodeId(node.id);
                                                    setSearchQuery('');
                                                    setIsSearchOpen(false);
                                                    // Center the node
                                                    if (containerRef.current) {
                                                        const clientW = containerRef.current.clientWidth;
                                                        const clientH = containerRef.current.clientHeight;
                                                        setOffset({
                                                            x: (clientW / 2) - node.x * zoom,
                                                            y: (clientH / 2) - node.y * zoom
                                                        });
                                                    }
                                                }}
                                            >
                                                <div className="p-1.5 rounded-lg bg-white/5">
                                                    <Target className="w-3.5 h-3.5 text-purple-400" />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-200">{node.data.label}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center text-zinc-500 text-sm italic">No nodes found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minimap */}
            <MindflowMinimap
                nodes={nodes}
                width={width}
                height={height}
                zoom={zoom}
                offset={offset}
                setOffset={setOffset}
                containerRef={containerRef}
            />

            <div className="absolute top-6 left-6 z-50 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-zinc-400 flex items-center gap-2 pointer-events-none uppercase tracking-[0.2em] font-orbitron">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                MINDFLOW VIEW
            </div>

            {/* Node Details Dialog */}
            <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
                <DialogContent className="sm:max-w-[500px] bg-zinc-950/95 border-white/10 backdrop-blur-2xl text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                {(LucideIcons as any)[toPascalCase(selectedNode?.data.icon || 'circle')] ?
                                    React.createElement((LucideIcons as any)[toPascalCase(selectedNode?.data.icon || 'circle')], { className: "w-5 h-5" }) :
                                    <Target className="w-5 h-5" />
                                }
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-orbitron tracking-tight text-white mb-1">
                                    {selectedNode?.data.label}
                                </DialogTitle>
                                <DialogDescription className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                                    {selectedNode?.type} in {data.topic}
                                    {selectedNode?.data.timestamp !== undefined && data.videoId && (
                                        <a
                                            href={`https://youtu.be/${data.videoId}?t=${Math.floor(selectedNode.data.timestamp)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="no-underline"
                                        >
                                            <Badge variant="secondary" className="text-[9px] h-4 py-0 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30 flex items-center gap-1 cursor-pointer transition-colors">
                                                <LucideIcons.Play className="w-1.5 h-1.5 fill-current" />
                                                {Math.floor(selectedNode.data.timestamp / 60)}:{(selectedNode.data.timestamp % 60).toString().padStart(2, '0')}
                                            </Badge>
                                        </a>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <Tabs defaultValue="about" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
                            <TabsTrigger value="about" className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                <Info className="w-4 h-4 mr-2" />
                                About
                            </TabsTrigger>
                            <TabsTrigger value="actions" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Zap className="w-4 h-4 mr-2" />
                                Actions
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="about" className="mt-0">
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 leading-relaxed text-zinc-300 text-sm">
                                    {selectedNode?.data.description || selectedNode?.data.thought || selectedNode?.data.insight || "Exploring the intricacies and relationships of this node within the broader context of " + data.topic + "."}
                                </div>
                                {selectedNode?.data.tags && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedNode.data.tags.map((tag: string, i: number) => (
                                            <Badge key={i} variant="outline" className="bg-purple-500/10 border-purple-500/20 text-purple-400 text-[10px]">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="actions" className="mt-0">
                            <div className="grid grid-cols-2 gap-3">
                                {selectedNode?.type === 'subcategory' && (
                                    <Button
                                        onClick={() => {
                                            if (onGenerateNewMap) {
                                                onGenerateNewMap(selectedNode.data.name, selectedNode.id);
                                                setSelectedNode(null);
                                            }
                                        }}
                                        className="col-span-2 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20 group"
                                    >
                                        <Zap className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                                        Generate Deep-Dive Map
                                        <ArrowRight className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setFocusedNodeId(selectedNode?.id || null);
                                        // Center the node
                                        if (containerRef.current && selectedNode) {
                                            const clientW = containerRef.current.clientWidth;
                                            const clientH = containerRef.current.clientHeight;
                                            setOffset({
                                                x: (clientW / 2) - selectedNode.x * zoom,
                                                y: (clientH / 2) - selectedNode.y * zoom
                                            });
                                        }
                                        setSelectedNode(null);
                                    }}
                                    className="h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                >
                                    <Target className="mr-2 h-4 w-4 text-purple-400" />
                                    Focus View
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (onNodeClick && selectedNode) onNodeClick(selectedNode.data);
                                        setSelectedNode(null);
                                    }}
                                    className="h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                >
                                    <Info className="mr-2 h-4 w-4 text-blue-400" />
                                    Detailed Explanation
                                </Button>

                                {onExplainInChat && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (selectedNode) onExplainInChat(`Explain "${selectedNode.data.label}" in the context of ${data.topic}.`);
                                            setSelectedNode(null);
                                        }}
                                        className="h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                    >
                                        <MessageSquare className="mr-2 h-4 w-4 text-pink-400" />
                                        Chat about this
                                    </Button>
                                )}

                                {onExplainWithExample && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (selectedNode) {
                                                const desc = selectedNode.data.description || selectedNode.data.thought || selectedNode.data.insight || '';
                                                onExplainWithExample(selectedNode.data.label, desc);
                                            }
                                            setSelectedNode(null);
                                        }}
                                        className="h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                    >
                                        <Lightbulb className="mr-2 h-4 w-4 text-amber-400" />
                                        Give Example
                                    </Button>
                                )}

                                {onPracticeClick && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (selectedNode) onPracticeClick(selectedNode.data.label);
                                            setSelectedNode(null);
                                        }}
                                        className="h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                    >
                                        <PenTool className="mr-2 h-4 w-4 text-emerald-400" />
                                        Practice Questions
                                    </Button>
                                )}

                                {onStartQuiz && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (selectedNode) onStartQuiz(selectedNode.data.label);
                                            setSelectedNode(null);
                                        }}
                                        className="h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                    >
                                        <GraduationCap className="mr-2 h-4 w-4 text-orange-400" />
                                        Interactive Quiz
                                    </Button>
                                )}

                                {onGenerateImage && selectedNode?.type === 'subcategory' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (onGenerateImage && selectedNode) onGenerateImage(selectedNode.data.name, data.topic);
                                            setSelectedNode(null);
                                        }}
                                        className="col-span-2 h-12 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-all justify-start"
                                    >
                                        <ImageIcon className="mr-2 h-4 w-4 text-cyan-400" />
                                        Generate Visualization
                                    </Button>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
});
