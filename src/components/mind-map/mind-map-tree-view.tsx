'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { MindMapData } from '@/types/mind-map';
import { cn, toPascalCase } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Move, Plus, Minus, Target, Zap, Info, MessageSquare, GraduationCap, Check } from 'lucide-react';
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

// ── Types ──────────────────────────────────────────────────────────────────

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

interface MindMapTreeViewProps {
    data: MindMapData;
    onNodeClick?: (node: any) => void;
    onGenerateNewMap: (topic: string, parentTopic?: string) => void;
    generatingNode?: string | null;
    onExplainInChat?: (message: string) => void;
    onExplainWithExample?: (topic: string, description: string) => void;
    onStartQuiz?: (topic: string) => void;
    onPracticeClick?: (topic: string) => void;
    onGenerateImage?: (topic: string, parentTopic?: string) => void;
    focusedNodeName?: string | null;
    resonanceNodes?: string[];
    onSynthesize?: (nodeLabels: string[]) => void;
    isSynthesisMode?: boolean;
    setIsSynthesisMode?: (value: boolean) => void;
    synthesisSelection?: string[];
    setSynthesisSelection?: (value: string[] | ((prev: string[]) => string[])) => void;
}

// ── Layout Constants ───────────────────────────────────────────────────────

const ROOT_WIDTH = 280;
const ROOT_HEIGHT = 92;
const NODE_WIDTH = 260;
const NODE_HEIGHT = 76;
const LEAF_WIDTH = 240;
const LEAF_HEIGHT = 64;

const H_SPACING = 380;
const V_SPACING = 48;
const ROOT_X = 140;

// ── Layout Engine ──────────────────────────────────────────────────────────

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
        return LEAF_HEIGHT;
    }

    if (children.length === 0) return nodeHeight;

    const childrenHeight = children.reduce((acc, child, idx) => {
        const childPath = type === 'subtopic' ? `${nodePath}-cat-${idx}` : `${nodePath}-sub-${idx}`;
        return acc + calculateSubtreeHeight(child, childType as any, collapsedNodes, childPath);
    }, 0);
    const spacingHeight = (children.length - 1) * V_SPACING;

    return Math.max(nodeHeight, childrenHeight + spacingHeight);
};

const LayoutEngine = (data: MindMapData, collapsedNodes: Set<string>) => {
    const nodes: NodePosition[] = [];
    const connections: Connection[] = [];

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

    let currentY = 0;

    if (data.mode === 'single') {
        (data.subTopics || []).forEach((st, stIdx) => {
            const stId = `st-${stIdx}`;
            const stHeight = calculateSubtreeHeight(st, 'subtopic', collapsedNodes, stId);
            const stY = currentY + stHeight / 2;

            const stCollapsed = collapsedNodes.has(stId);
            nodes.push({
                id: stId,
                x: ROOT_X + H_SPACING,
                y: stY,
                data: { label: st.name, icon: st.icon, hiddenCount: stCollapsed ? (st.categories?.length || 0) : 0 },
                type: 'subtopic',
                parentId: 'root',
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            });

            if (stCollapsed) {
                currentY += stHeight + V_SPACING;
                return;
            }

            let catCurrentY = currentY;

            (st.categories || []).forEach((cat, catIdx) => {
                const catId = `${stId}-cat-${catIdx}`;
                const catHeight = calculateSubtreeHeight(cat, 'category', collapsedNodes, catId);
                const catY = catCurrentY + catHeight / 2;

                const catCollapsed = collapsedNodes.has(catId);
                nodes.push({
                    id: catId,
                    x: ROOT_X + H_SPACING * 2,
                    y: catY,
                    data: { label: cat.name, icon: cat.icon, hiddenCount: catCollapsed ? (cat.subCategories?.length || 0) : 0 },
                    type: 'category',
                    parentId: stId,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT
                });

                if (catCollapsed) {
                    catCurrentY += catHeight + V_SPACING;
                    return;
                }

                let subCatCurrentY = catCurrentY;
                (cat.subCategories || []).forEach((subCat, scIdx) => {
                    const subCatId = `${catId}-sub-${scIdx}`;
                    const subCatY = subCatCurrentY + LEAF_HEIGHT / 2;
                    nodes.push({
                        id: subCatId,
                        x: ROOT_X + H_SPACING * 3,
                        y: subCatY,
                        data: { label: subCat.name, ...subCat },
                        type: 'subcategory',
                        parentId: catId,
                        width: LEAF_WIDTH,
                        height: LEAF_HEIGHT
                    });
                    subCatCurrentY += LEAF_HEIGHT + V_SPACING;
                });

                catCurrentY = cat.subCategories.length === 0 ? catCurrentY + catHeight + V_SPACING : subCatCurrentY;
            });

            currentY = st.categories.length === 0 ? currentY + stHeight + V_SPACING : catCurrentY;
        });
    }

    const totalTreeHeight = currentY;
    rootNode.y = totalTreeHeight / 2;

    // Generate Bézier connections
    nodes.forEach(node => {
        if (node.parentId) {
            const parent = nodes.find(n => n.id === node.parentId);
            if (parent) {
                const sourceX = parent.x + parent.width;
                const sourceY = parent.y;
                const targetX = node.x;
                const targetY = node.y;
                const midX = (sourceX + targetX) / 2;

                connections.push({
                    id: `e-${parent.id}-${node.id}`,
                    sourceId: parent.id,
                    targetId: node.id,
                    path: `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`
                });
            }
        }
    });

    return { nodes, connections, width: ROOT_X + H_SPACING * 4, height: totalTreeHeight };
};

// ── Node Card Component (simplified, memoized) ────────────────────────────

interface TreeNodeCardProps {
    node: NodePosition;
    isCollapsed: boolean;
    isLeaf: boolean;
    isFocused: boolean;
    isDimmed: boolean;
    Icon: React.ComponentType<any>;
    iconClass: string;
    onToggle: (id: string) => void;
    onClick: (node: NodePosition) => void;
    onFocus: (id: string) => void;
    generatingNode?: string | null;
    synthesisSelected: boolean;
    hiddenCount?: number;
}

const TreeNodeCard = React.memo(({
    node,
    isCollapsed,
    isLeaf,
    isFocused,
    isDimmed,
    Icon,
    iconClass,
    onToggle,
    onClick,
    onFocus,
    generatingNode,
    synthesisSelected,
    hiddenCount,
}: TreeNodeCardProps) => {
    const showExpandBtn = !isLeaf && node.type !== 'root';

    const cardStyle = node.type === 'root'
        ? "bg-gradient-to-br from-purple-600 to-indigo-700 border-white/20 text-white shadow-lg z-30"
        : node.type === 'subtopic'
            ? "bg-zinc-900/95 border-white/10 text-zinc-100 shadow-md z-20 hover:border-white/20"
            : node.type === 'category'
                ? "bg-zinc-900/80 border-white/10 text-zinc-200 shadow-sm z-10 hover:border-white/20 hover:bg-zinc-900/90"
                : "bg-zinc-900/60 border-white/10 text-zinc-300 shadow-sm z-10 cursor-pointer hover:border-purple-500/50 hover:text-white hover:bg-zinc-800/80";

    return (
        <div
            className={cn(
                "absolute flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 select-none",
                "max-w-[320px] min-w-[200px] whitespace-normal break-words leading-snug",
                cardStyle,
                isDimmed && "opacity-20",
                isFocused && "ring-2 ring-purple-500/50",
            )}
            style={{
                left: node.x,
                top: node.y,
                transform: 'translate(0, -50%)',
            }}
            onClick={() => onClick(node)}
        >
            {/* Expansion Button with count badge */}
            {showExpandBtn && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-50">
                    {isCollapsed && hiddenCount !== undefined && hiddenCount > 0 && (
                        <span className="text-[9px] font-bold text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded-full border border-purple-500/30 leading-none whitespace-nowrap">
                            +{hiddenCount}
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                        className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center border-2 border-zinc-950 shadow-md hover:bg-purple-500 transition-colors shrink-0"
                    >
                        {isCollapsed ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}

            {/* Icon */}
            <div className={cn(
                "flex items-center justify-center rounded-lg flex-shrink-0",
                node.type === 'root' ? "bg-white/20 p-2.5" : "bg-white/10 p-2"
            )}>
                <Icon className={node.type === 'root' ? "w-6 h-6" : "w-4 h-4"} />
            </div>

            {/* Label */}
            <div className="flex flex-col min-w-0 pr-6">
                <span className={cn(
                    "block",
                    node.type === 'root' ? "text-xl font-bold tracking-tight leading-tight" :
                        node.type === 'subtopic' ? "text-sm font-bold tracking-tight leading-snug" :
                            "text-xs font-semibold leading-snug"
                )}>
                    {node.data.label}
                </span>
                {isLeaf && generatingNode === node.data.name && (
                    <span className="text-[9px] text-purple-400 flex items-center gap-1 animate-pulse mt-0.5">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Generating...
                    </span>
                )}
            </div>

            {/* Selection Checkmark for Synthesis */}
            {synthesisSelected && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 bg-green-500 rounded-full text-black shadow z-50">
                    <Check className="w-3 h-3 stroke-[3]" />
                </div>
            )}
        </div>
    );
});
TreeNodeCard.displayName = 'TreeNodeCard';

// ── Main Component ────────────────────────────────────────────────────────

export const MindMapTreeView = React.memo(({
    data,
    onNodeClick,
    onGenerateNewMap,
    generatingNode,
    onExplainInChat,
    onExplainWithExample,
    onStartQuiz,
    onPracticeClick,
    onGenerateImage,
    focusedNodeName,
    resonanceNodes = [],
    onSynthesize,
    isSynthesisMode = false,
    setIsSynthesisMode,
    synthesisSelection = [],
    setSynthesisSelection
}: MindMapTreeViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const nodesRef = useRef<NodePosition[]>([]);
    const zoomRef = useRef(1);
    const offsetRef = useRef({ x: 50, y: 100 });

    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 50, y: 100 });
    const [isInitialFit, setIsInitialFit] = useState(true);
    const [isAnimatingZoom, setIsAnimatingZoom] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isWheelScrolling, setIsWheelScrolling] = useState(false);
    const wheelDebounceRef = useRef<ReturnType<typeof setTimeout>>();
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Generate initial collapsed set: only root + subtopics visible
    const generateInitialCollapsed = useCallback((mapData: MindMapData): Set<string> => {
        const collapsed = new Set<string>();
        if (mapData.mode !== 'single' || !mapData.subTopics) return collapsed;
        mapData.subTopics.forEach((st, stIdx) => {
            const stId = `st-${stIdx}`;
            if (st.categories) {
                st.categories.forEach((cat, catIdx) => {
                    const catId = `${stId}-cat-${catIdx}`;
                    collapsed.add(catId);
                    if (cat.subCategories) {
                        cat.subCategories.forEach((_, scIdx) => {
                            collapsed.add(`${catId}-sub-${scIdx}`);
                        });
                    }
                });
            }
        });
        return collapsed;
    }, []);

    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => generateInitialCollapsed(data));

    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);
    const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

    const { nodes, connections, width, height } = useMemo(() => LayoutEngine(data, collapsedNodes), [data, collapsedNodes]);

    useEffect(() => {
        nodesRef.current = nodes;
        zoomRef.current = zoom;
        offsetRef.current = offset;
    });

    const lastExpandedRef = useRef<string | null>(null);

    const toggleCollapse = (nodeId: string) => {
        const wasCollapsed = collapsedNodes.has(nodeId);
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
        if (wasCollapsed) {
            lastExpandedRef.current = nodeId;
        }
    };

    // ── Auto-pan after expand: reveal children if off-screen ──
    useEffect(() => {
        const expandedId = lastExpandedRef.current;
        if (!expandedId) return;
        lastExpandedRef.current = null;

        const target = nodesRef.current.find(n => n.id === expandedId);
        if (!target || !containerRef.current) return;

        // Find children of the expanded node
        const children = nodesRef.current.filter(n => n.parentId === expandedId);
        if (children.length === 0) return;

        const currentZoom = zoomRef.current;
        const curOffset = offsetRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        const clientW = rect.width;
        const clientH = rect.height;
        const padding = 40;

        // Bounding box of all children in screen space
        const minX = Math.min(...children.map(c => curOffset.x + c.x * currentZoom));
        const maxX = Math.max(...children.map(c => curOffset.x + (c.x + c.width) * currentZoom));
        const minY = Math.min(...children.map(c => curOffset.y + (c.y - c.height / 2) * currentZoom));
        const maxY = Math.max(...children.map(c => curOffset.y + (c.y + c.height / 2) * currentZoom));

        const viewLeft = padding;
        const viewRight = clientW - padding;
        const viewTop = padding;
        const viewBottom = clientH - padding;

        let panX = 0;
        let panY = 0;

        if (minX < viewLeft) panX = viewLeft - minX;
        else if (maxX > viewRight) panX = viewRight - maxX;

        if (minY < viewTop) panY = viewTop - minY;
        else if (maxY > viewBottom) panY = viewBottom - maxY;

        if (panX !== 0 || panY !== 0) {
            setIsAnimatingZoom(true);
            setOffset(prev => ({
                x: prev.x + panX,
                y: prev.y + panY,
            }));
            if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
            zoomTimerRef.current = setTimeout(() => setIsAnimatingZoom(false), 300);
        }
    }, [nodes]);

    // ── Non-passive wheel listener — smooth exponential zoom + cursor anchoring + scroll debounce ──
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();

            // Mark as wheel-scrolling so transition is disabled during active scroll
            setIsWheelScrolling(true);
            if (wheelDebounceRef.current) clearTimeout(wheelDebounceRef.current);
            wheelDebounceRef.current = setTimeout(() => setIsWheelScrolling(false), 80);

            if (e.ctrlKey || e.metaKey) {
                // Exponential zoom: finer control, natural feel
                const scale = Math.exp(-e.deltaY * 0.002);
                // Compute cursor position relative to container synchronously
                const rect = el.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                setZoom(prev => {
                    const newZoom = Math.min(Math.max(prev * scale, 0.4), 2);
                    // Zoom toward the mouse cursor position
                    setOffset(o => ({
                        x: mouseX - (mouseX - o.x) * (newZoom / prev),
                        y: mouseY - (mouseY - o.y) * (newZoom / prev),
                    }));
                    return newZoom;
                });
            } else {
                setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', onWheel);
            if (wheelDebounceRef.current) clearTimeout(wheelDebounceRef.current);
        };
    }, []);

    // Cleanup zoom timer on unmount
    useEffect(() => {
        return () => {
            if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
        };
    }, []);

    // ── Smart zoom-to-node: only pan if node is outside viewport, preserving zoom ──
    const zoomToNodeById = useCallback((nodeId: string) => {
        const target = nodesRef.current.find(n => n.id === nodeId);
        if (!target || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientW = rect.width;
        const clientH = rect.height;
        const currentZoom = zoomRef.current;
        const padding = 40;

        // Calculate node bounds in screen space
        const nodeLeft = offsetRef.current.x + target.x * currentZoom;
        const nodeRight = offsetRef.current.x + (target.x + target.width) * currentZoom;
        const nodeTop = offsetRef.current.y + (target.y - target.height / 2) * currentZoom;
        const nodeBottom = offsetRef.current.y + (target.y + target.height / 2) * currentZoom;

        const viewLeft = padding;
        const viewRight = clientW - padding;
        const viewTop = padding;
        const viewBottom = clientH - padding;

        const isFullyVisible =
            nodeLeft >= viewLeft &&
            nodeRight <= viewRight &&
            nodeTop >= viewTop &&
            nodeBottom <= viewBottom;

        setFocusedNodeId(target.id);

        if (isFullyVisible) return; // Already visible — preserve viewport

        // Compute minimal pan to bring node into view
        let panX = 0;
        let panY = 0;

        if (nodeLeft < viewLeft) panX = viewLeft - nodeLeft;
        else if (nodeRight > viewRight) panX = viewRight - nodeRight;

        if (nodeTop < viewTop) panY = viewTop - nodeTop;
        else if (nodeBottom > viewBottom) panY = viewBottom - nodeBottom;

        setIsAnimatingZoom(true);
        setOffset(prev => ({
            x: prev.x + panX,
            y: prev.y + panY,
        }));

        if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
        zoomTimerRef.current = setTimeout(() => setIsAnimatingZoom(false), 300);
    }, []);

    // ── Auto-fit ──
    const fitTreeInView = useCallback(() => {
        if (!containerRef.current || height === 0) return;
        const clientW = containerRef.current.clientWidth;
        const clientH = containerRef.current.clientHeight;
        if (clientW === 0 || clientH === 0) return;

        const padding = 80;
        const fitZoom = Math.min((clientW - padding * 2) / width, (clientH - padding * 2) / height, 1);
        const clampedZoom = Math.max(fitZoom, 0.4);

        setZoom(clampedZoom);
        setOffset({
            x: (clientW - width * clampedZoom) / 2,
            y: (clientH - height * clampedZoom) / 2,
        });
        setIsInitialFit(false);
    }, [width, height]);

    useEffect(() => {
        const timer = setTimeout(() => fitTreeInView(), 50);
        return () => clearTimeout(timer);
    }, [fitTreeInView]);

    // Zoom to focusedNodeName when triggered externally (smooth animation)
    useEffect(() => {
        if (!focusedNodeName) return;
        const target = nodesRef.current.find(n => n.data.label.toLowerCase() === focusedNodeName.toLowerCase());
        if (target) {
            zoomToNodeById(target.id);
        }
    }, [focusedNodeName, zoomToNodeById]);

    // ── Pan via mouse drag ──
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    // ── Touch gestures — pan + cursor-anchored exponential pinch-zoom ──
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
        } else if (e.touches.length === 2) {
            setIsDragging(true);
            setLastTouchDistance(Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            ));
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
            setOffset({
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y,
            });
        } else if (e.touches.length === 2 && lastTouchDistance !== null) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            // Exponential zoom consistent with mouse wheel
            const scale = Math.exp((dist - lastTouchDistance) * 0.005);
            const rect = containerRef.current!.getBoundingClientRect();
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

            setZoom(prev => {
                const newZoom = Math.min(Math.max(prev * scale, 0.4), 2);
                // Zoom toward the midpoint between the two fingers
                setOffset(o => ({
                    x: midX - (midX - o.x) * (newZoom / prev),
                    y: midY - (midY - o.y) * (newZoom / prev),
                }));
                return newZoom;
            });
            setLastTouchDistance(dist);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setLastTouchDistance(null);
    };

    const zoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
    const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4));
    const resetZoom = () => fitTreeInView();

    const handleNodeClick = (node: NodePosition) => {
        if (isSynthesisMode && setSynthesisSelection) {
            setSynthesisSelection(prev => {
                if (prev.includes(node.data.label)) return prev.filter(l => l !== node.data.label);
                if (prev.length >= 2) return [prev[1], node.data.label];
                return [...prev, node.data.label];
            });
            return;
        }
        setSelectedNode(node);
        if (onNodeClick) onNodeClick(node);
    };

    const handleSynthesizeClick = () => {
        if (synthesisSelection.length === 2 && onSynthesize && setIsSynthesisMode && setSynthesisSelection) {
            onSynthesize(synthesisSelection);
            setIsSynthesisMode(false);
            setSynthesisSelection([]);
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-zinc-950/95 relative overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, #a855f7 1px, transparent 0)',
                    backgroundSize: '28px 28px',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                }}
            />

            {/* Transform Container */}
            <div
                className={cn(
                    "absolute origin-top-left will-change-transform",
                    isDragging || isWheelScrolling ? "transition-none" :
                    isInitialFit ? "transition-transform duration-700 ease-out" :
                    isAnimatingZoom ? "transition-transform duration-300 ease-out" :
                    "transition-transform duration-200 ease-out"
                )}
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
            >
                {/* Connections (plain SVG, no framer-motion) */}
                <svg width={width} height={height} className="overflow-visible pointer-events-none absolute top-0 left-0">
                    {connections.map(conn => (
                        <path
                            key={conn.id}
                            d={conn.path}
                            fill="none"
                            stroke="rgba(168, 85, 247, 0.25)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>

                {/* Nodes */}
                {nodes.map(node => {
                    const Icon = (LucideIcons as any)[toPascalCase(node.data.icon || 'circle')] || LucideIcons.Circle;
                    const isLeaf = node.type === 'subcategory';
                    const isCollapsed = collapsedNodes.has(node.id);
                    const isFocused = focusedNodeId === node.id;                            const isDimmed = !!(focusedNodeId && !isFocused && node.id !== 'root');
                    const synSelected = synthesisSelection.includes(node.data.label);

                    return (
                        <TreeNodeCard
                            key={node.id}
                            node={node}
                            isCollapsed={isCollapsed}
                            isLeaf={isLeaf}
                            isFocused={isFocused}
                            isDimmed={isDimmed}
                            Icon={Icon}
                            iconClass=""
                            onToggle={toggleCollapse}
                            onClick={handleNodeClick}
                            onFocus={setFocusedNodeId}
                            generatingNode={generatingNode}
                            synthesisSelected={synSelected}
                            hiddenCount={node.data.hiddenCount}
                        />
                    );
                })}
            </div>

            {/* Controls Overlay */}
            <div className="absolute top-6 right-6 flex flex-col gap-2 z-50">
                <button onMouseDown={e => e.stopPropagation()} onClick={zoomIn} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center font-bold text-base backdrop-blur-sm">
                    +
                </button>
                <button onMouseDown={e => e.stopPropagation()} onClick={zoomOut} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center font-bold text-base backdrop-blur-sm">
                    −
                </button>
                <button onMouseDown={e => e.stopPropagation()} onClick={resetZoom} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center backdrop-blur-sm">
                    <Move className="w-4 h-4" />
                </button>
                {setIsSynthesisMode && (
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => { setIsSynthesisMode(!isSynthesisMode); setSynthesisSelection?.([]); }}
                        title="Knowledge Alchemy"
                        className={cn(
                            "w-9 h-9 rounded-xl border backdrop-blur-sm transition-all flex items-center justify-center",
                            isSynthesisMode ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        )}
                    >
                        <Zap className={cn("w-4 h-4", isSynthesisMode && "animate-pulse")} />
                    </button>
                )}
            </div>

            {/* Synthesis Panel */}
            {isSynthesisMode && (
                <div className="absolute top-6 right-[72px] z-50">
                    <div className="p-3 rounded-2xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl flex flex-col gap-3 min-w-[200px]">
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Selection</h4>
                            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                                {synthesisSelection.length === 0 && (
                                    <span className="text-[10px] text-zinc-600 italic">Select 2 nodes...</span>
                                )}
                                {synthesisSelection.map(label => (
                                    <Badge key={label} variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] font-bold">
                                        {label}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <Button
                            disabled={synthesisSelection.length !== 2}
                            onClick={handleSynthesizeClick}
                            className="w-full h-8 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black text-[10px] uppercase tracking-wider"
                        >
                            FUSE
                        </Button>
                    </div>
                </div>
            )}

            {/* Minimap */}
            <MindflowMinimap nodes={nodes} width={width} height={height} zoom={zoom} offset={offset} setOffset={setOffset} containerRef={containerRef} />

            {/* Badge */}
            <div className="absolute top-6 left-6 z-50 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold text-zinc-400 flex items-center gap-2 pointer-events-none uppercase tracking-[0.2em] font-orbitron">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                TREE VIEW
            </div>

            {/* Node Details Dialog */}
            <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
                <DialogContent className="sm:max-w-[500px] bg-zinc-950/95 border-white/10 backdrop-blur-2xl text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                {(LucideIcons as any)[toPascalCase(selectedNode?.data.icon || 'circle')]
                                    ? React.createElement((LucideIcons as any)[toPascalCase(selectedNode?.data.icon || 'circle')], { className: "w-5 h-5" })
                                    : <Target className="w-5 h-5" />}
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-orbitron tracking-tight text-white mb-1">
                                    {selectedNode?.data.label}
                                </DialogTitle>
                                <DialogDescription className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">
                                    {selectedNode?.type} in {data.topic}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <Tabs defaultValue="about">
                        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 rounded-xl p-1 mb-4">
                            <TabsTrigger value="about" className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs">
                                <Info className="w-3.5 h-3.5 mr-1.5" />About
                            </TabsTrigger>
                            <TabsTrigger value="actions" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
                                <Zap className="w-3.5 h-3.5 mr-1.5" />Actions
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="about" className="mt-0">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm leading-relaxed">
                                {selectedNode?.data.description || selectedNode?.data.thought || selectedNode?.data.insight || `Part of the "${data.topic}" knowledge structure.`}
                            </div>
                        </TabsContent>
                        <TabsContent value="actions" className="mt-0">
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => { if (selectedNode) { zoomToNodeById(selectedNode.id); setSelectedNode(null); } }} className="h-10 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 text-xs">
                                    <Target className="mr-1.5 w-3.5 h-3.5 text-purple-400" />Focus
                                </Button>
                                <Button variant="outline" onClick={() => { if (selectedNode && onNodeClick) onNodeClick(selectedNode.data); setSelectedNode(null); }} className="h-10 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 text-xs">
                                    <Info className="mr-1.5 w-3.5 h-3.5 text-blue-400" />Explain
                                </Button>
                                {onExplainInChat && (
                                    <Button variant="outline" onClick={() => { if (selectedNode) onExplainInChat(`Explain "${selectedNode.data.label}" in context of ${data.topic}.`); setSelectedNode(null); }} className="h-10 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 text-xs">
                                        <MessageSquare className="mr-1.5 w-3.5 h-3.5 text-pink-400" />Chat
                                    </Button>
                                )}
                                {onStartQuiz && (
                                    <Button variant="outline" onClick={() => { if (selectedNode) onStartQuiz(selectedNode.data.label); setSelectedNode(null); }} className="h-10 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 text-xs">
                                        <GraduationCap className="mr-1.5 w-3.5 h-3.5 text-orange-400" />Quiz
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
MindMapTreeView.displayName = 'MindMapTreeView';
