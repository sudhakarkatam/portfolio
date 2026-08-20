import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { VectorNode, RESUME_VECTOR_NODES, VECTOR_CLUSTERS } from "@/data/resumeVectorData";
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Layers,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ObsidianGraphViewProps {
  selectedNode: VectorNode | null;
  onSelectNode: (node: VectorNode | null) => void;
  highlightedNodeIds?: string[];
  activeClusterFilter?: string;
  onSelectCluster?: (cluster: string | null) => void;
}

interface PhysicsNode {
  data: VectorNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null; // fixed drag position
  fy?: number | null;
  radius: number;
}

interface PhysicsLink {
  source: PhysicsNode;
  target: PhysicsNode;
  distance: number;
}

export const ObsidianGraphView: React.FC<ObsidianGraphViewProps> = ({
  selectedNode,
  onSelectNode,
  highlightedNodeIds = [],
  activeClusterFilter,
  onSelectCluster,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obsidian Controls & Physics Parameters State
  const [repelForce, setRepelForce] = useState(140);
  const [linkDistance, setLinkDistance] = useState(70);
  const [centerGravity, setCenterGravity] = useState(0.04);
  const [nodeScale, setNodeScale] = useState(1.0);
  const [animatePulses, setAnimatePulses] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Canvas Pan & Zoom State
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const targetZoomRef = useRef(1.0);
  const isPanningRef = useRef(false);
  const isDraggingNodeRef = useRef<PhysicsNode | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const [hoveredNode, setHoveredNode] = useState<VectorNode | null>(null);
  const hoveredNodeRef = useRef<VectorNode | null>(null);
  hoveredNodeRef.current = hoveredNode;

  // Pulse phase for travelling energy dots
  const pulsePhaseRef = useRef(0);

  // Initialize Physics Graph Nodes & Links
  const physicsGraphRef = useRef<{ nodes: PhysicsNode[]; links: PhysicsLink[] }>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    // Build physics nodes from RESUME_VECTOR_NODES
    const nodeMap = new Map<string, PhysicsNode>();

    const nodes: PhysicsNode[] = RESUME_VECTOR_NODES.map((node) => {
      // 2D projection with small random offset
      const pn: PhysicsNode = {
        data: node,
        x: node.x * 2.2 + (Math.random() - 0.5) * 40,
        y: node.y * 2.2 + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: node.size * 0.5,
      };
      nodeMap.set(node.id, pn);
      return pn;
    });

    const links: PhysicsLink[] = [];
    RESUME_VECTOR_NODES.forEach((source) => {
      const srcNode = nodeMap.get(source.id);
      if (!srcNode) return;

      source.connections.forEach((targetId) => {
        const tgtNode = nodeMap.get(targetId);
        if (!tgtNode || source.id > targetId) return;

        links.push({
          source: srcNode,
          target: tgtNode,
          distance: 70,
        });
      });
    });

    physicsGraphRef.current = { nodes, links };
  }, []);

  // Force-Directed Physics Simulation Step
  const stepPhysics = useCallback(() => {
    const { nodes, links } = physicsGraphRef.current;
    const count = nodes.length;
    if (count === 0) return;

    // 1. Repulsion force between all node pairs (Coulomb's Law)
    const k = repelForce * 15;
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < count; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        if (dist < 400) {
          const force = k / (distSq + 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (a.fx === undefined || a.fx === null) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (b.fx === undefined || b.fx === null) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }
    }

    // 2. Spring link force (Hooke's Law)
    const springK = 0.045;
    links.forEach((link) => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.hypot(dx, dy) || 1;
      const displacement = dist - linkDistance;
      const force = displacement * springK;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (link.source.fx === undefined || link.source.fx === null) {
        link.source.vx += fx;
        link.source.vy += fy;
      }
      if (link.target.fx === undefined || link.target.fx === null) {
        link.target.vx -= fx;
        link.target.vy -= fy;
      }
    });

    // 3. Center Gravity & Drag Damping
    const friction = 0.88;
    nodes.forEach((node) => {
      if (node.fx !== undefined && node.fx !== null) {
        node.x = node.fx;
        node.y = node.fy!;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      // Gravity towards center (0, 0)
      node.vx -= node.x * centerGravity;
      node.vy -= node.y * centerGravity;

      node.vx *= friction;
      node.vy *= friction;

      node.x += node.vx;
      node.y += node.vy;
    });
  }, [repelForce, linkDistance, centerGravity]);

  // Main Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      pulsePhaseRef.current = (pulsePhaseRef.current + 0.015) % 1;
      zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.1;

      stepPhysics();
      drawCanvas();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [stepPhysics, highlightedNodeIds, selectedNode, activeClusterFilter, nodeScale, animatePulses]);

  // Draw Obsidian Network Graph
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2 + panRef.current.x;
    const centerY = height / 2 + panRef.current.y;
    const zoom = zoomRef.current;

    const { nodes, links } = physicsGraphRef.current;
    const hasHighlight = highlightedNodeIds.length > 0;
    const hasClusterFilter = !!activeClusterFilter;
    const activeHovered = hoveredNodeRef.current;

    // Helper: is connected to hovered node
    const isNeighborOfHovered = (nodeId: string) => {
      if (!activeHovered) return false;
      if (activeHovered.id === nodeId) return true;
      return activeHovered.connections.includes(nodeId) ||
        RESUME_VECTOR_NODES.find((n) => n.id === nodeId)?.connections.includes(activeHovered.id);
    };

    // 1. Draw Links
    ctx.save();
    links.forEach((link) => {
      const srcNode = link.source.data;
      const tgtNode = link.target.data;

      const sx = centerX + link.source.x * zoom;
      const sy = centerY + link.source.y * zoom;
      const tx = centerX + link.target.x * zoom;
      const ty = centerY + link.target.y * zoom;

      const isSrcHighlighted = highlightedNodeIds.includes(srcNode.id);
      const isTgtHighlighted = highlightedNodeIds.includes(tgtNode.id);
      const isSrcSelected = selectedNode?.id === srcNode.id;
      const isTgtSelected = selectedNode?.id === tgtNode.id;

      const isConnectedToHover = activeHovered
        ? isNeighborOfHovered(srcNode.id) && isNeighborOfHovered(tgtNode.id)
        : false;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);

      if (isSrcSelected || isTgtSelected || isConnectedToHover) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1.8 * zoom;
      } else if (isSrcHighlighted && isTgtHighlighted) {
        ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
        ctx.lineWidth = 1.6 * zoom;
      } else if (activeHovered && !isConnectedToHover) {
        ctx.strokeStyle = "rgba(100, 100, 130, 0.04)";
        ctx.lineWidth = 0.5;
      } else {
        ctx.strokeStyle = "rgba(120, 130, 160, 0.16)";
        ctx.lineWidth = 0.8 * zoom;
      }
      ctx.stroke();

      // Energy Pulse dot travelling along active links
      if (animatePulses && (isConnectedToHover || isSrcSelected || isTgtSelected || (isSrcHighlighted && isTgtHighlighted))) {
        const progress = pulsePhaseRef.current;
        const px = sx + (tx - sx) * progress;
        const py = sy + (ty - sy) * progress;

        ctx.beginPath();
        ctx.arc(px, py, 3 * zoom, 0, Math.PI * 2);
        ctx.fillStyle = isConnectedToHover || isSrcSelected ? "#ffffff" : "#c084fc";
        ctx.shadowColor = "#c084fc";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    ctx.restore();

    // 2. Draw Nodes
    nodes.forEach((pn) => {
      const node = pn.data;
      const sx = centerX + pn.x * zoom;
      const sy = centerY + pn.y * zoom;

      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = highlightedNodeIds.includes(node.id);
      const isHovered = activeHovered?.id === node.id;
      const isClusterMatch = !activeClusterFilter || node.cluster === activeClusterFilter;
      const isNeighbor = activeHovered ? isNeighborOfHovered(node.id) : true;

      let isDimmed = false;
      if (hasHighlight && !isHighlighted && !isSelected) isDimmed = true;
      if (hasClusterFilter && !isClusterMatch && !isSelected) isDimmed = true;
      if (activeHovered && !isNeighbor) isDimmed = true;

      const baseRadius = pn.radius * nodeScale * zoom;
      const radius = Math.max(3.5, isSelected ? baseRadius * 1.5 : isHovered ? baseRadius * 1.3 : baseRadius);

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.15 : 1.0;

      // Glow halo on selected/hovered
      if (isSelected || isHighlighted || isHovered) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 2.4, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(sx, sy, radius * 0.4, sx, sy, radius * 2.4);
        glowGrad.addColorStop(0, node.glowColor);
        glowGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }

      // Outer dashed circle on selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#ffffff" : node.color;
      ctx.fill();

      ctx.strokeStyle = isSelected ? node.color : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Node Label (Obsidian clean text typography)
      const shouldShowLabel = isSelected || isHovered || isHighlighted || isNeighbor || (!isDimmed && zoom > 0.85);
      if (shouldShowLabel) {
        ctx.font = `${isSelected || isHovered ? "bold 11px" : "10px"} font-mono, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const textY = sy + radius + 4;
        const text = node.label;
        const textWidth = ctx.measureText(text).width;

        ctx.fillStyle = isSelected
          ? "rgba(10, 10, 15, 0.95)"
          : isHighlighted
          ? "rgba(20, 15, 35, 0.9)"
          : "rgba(12, 12, 18, 0.8)";
        ctx.beginPath();
        ctx.roundRect(sx - textWidth / 2 - 4, textY - 2, textWidth + 8, 15, 3);
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#ffffff" : isHighlighted ? node.color : "rgba(255,255,255,0.15)";
        ctx.lineWidth = isSelected ? 1.5 : 0.8;
        ctx.stroke();

        ctx.fillStyle = isSelected ? "#ffffff" : isHighlighted ? "#f3e8ff" : "rgba(240, 240, 255, 0.9)";
        ctx.fillText(text, sx, textY);
      }

      ctx.restore();
    });
  }, [highlightedNodeIds, selectedNode, activeClusterFilter, nodeScale, animatePulses]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pointer Drag & Pan Controls
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = canvas.width / (2 * (window.devicePixelRatio || 1)) + panRef.current.x;
    const centerY = canvas.height / (2 * (window.devicePixelRatio || 1)) + panRef.current.y;
    const zoom = zoomRef.current;

    // Check if clicked a node
    const { nodes } = physicsGraphRef.current;
    let clickedNode: PhysicsNode | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const pn = nodes[i];
      const sx = centerX + pn.x * zoom;
      const sy = centerY + pn.y * zoom;
      const dist = Math.hypot(sx - mouseX, sy - mouseY);
      if (dist <= pn.radius * 2.5 * zoom + 8) {
        clickedNode = pn;
        break;
      }
    }

    if (clickedNode) {
      isDraggingNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
    } else {
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoom = zoomRef.current;

    const centerX = canvas.width / (2 * (window.devicePixelRatio || 1)) + panRef.current.x;
    const centerY = canvas.height / (2 * (window.devicePixelRatio || 1)) + panRef.current.y;

    if (isDraggingNodeRef.current) {
      const node = isDraggingNodeRef.current;
      node.fx = (mouseX - centerX) / zoom;
      node.fy = (mouseY - centerY) / zoom;
      return;
    }

    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      panRef.current.x += dx;
      panRef.current.y += dy;
      return;
    }

    // Hover hit test
    const { nodes } = physicsGraphRef.current;
    let hit: VectorNode | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const pn = nodes[i];
      const sx = centerX + pn.x * zoom;
      const sy = centerY + pn.y * zoom;
      const dist = Math.hypot(sx - mouseX, sy - mouseY);
      if (dist <= pn.radius * 2.5 * zoom + 8) {
        hit = pn.data;
        break;
      }
    }
    setHoveredNode(hit);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingNodeRef.current) {
      const dragged = isDraggingNodeRef.current;
      isDraggingNodeRef.current = null;
      dragged.fx = null;
      dragged.fy = null;
      onSelectNode(dragged.data);
      return;
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0012;
    targetZoomRef.current = Math.max(0.4, Math.min(2.5, targetZoomRef.current + delta));
  };

  const handleResetGraph = () => {
    panRef.current = { x: 0, y: 0 };
    targetZoomRef.current = 1.0;
    setRepelForce(140);
    setLinkDistance(70);
    setCenterGravity(0.04);
    setNodeScale(1.0);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[460px] sm:h-[580px] md:h-[640px] rounded-3xl overflow-hidden bg-[#07070a] border border-zinc-800 shadow-2xl select-none"
    >
      {/* 2D Physics Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Top Left: Obsidian Header HUD */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-purple-500/30 text-xs font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <span className="font-bold text-white tracking-wider">OBSIDIAN GRAPH VIEW</span>
          <span className="text-zinc-600">|</span>
          <span className="text-purple-300 font-semibold">Force-Directed Physics</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/70 px-3 py-1 rounded-full border border-zinc-800 backdrop-blur-sm">
          <span>Drag nodes to pull network • Hover to isolate cluster</span>
        </div>
      </div>

      {/* Top Right: Obsidian Settings Toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border backdrop-blur-md transition-colors ${
            showSettingsPanel
              ? "bg-purple-600 text-white border-purple-500 shadow-md"
              : "bg-zinc-900/85 border-zinc-800 text-zinc-300 hover:text-white"
          }`}
        >
          <SlidersHorizontal size={13} />
          <span>Graph Settings</span>
        </button>

        <button
          onClick={handleResetGraph}
          className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Reset Graph Position"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Obsidian-Style Control Drawer Panel (Top Right overlay) */}
      {showSettingsPanel && (
        <div className="absolute top-16 right-4 w-72 sm:w-80 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-4 backdrop-blur-xl shadow-2xl space-y-4 pointer-events-auto text-left text-xs font-mono max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
              // Obsidian Physics & Display
            </span>
            <button
              onClick={handleResetGraph}
              className="text-[10px] text-purple-400 hover:underline"
            >
              Reset Defaults
            </button>
          </div>

          {/* Forces Section */}
          <div className="space-y-3">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
              Forces & Simulation:
            </span>

            {/* Repel Force */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Repel Force (Charge):</span>
                <span className="text-white">{repelForce}</span>
              </div>
              <input
                type="range"
                min="40"
                max="300"
                value={repelForce}
                onChange={(e) => setRepelForce(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Link Distance */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Link Distance:</span>
                <span className="text-white">{linkDistance}px</span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                value={linkDistance}
                onChange={(e) => setLinkDistance(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Center Gravity */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Center Gravity:</span>
                <span className="text-white">{centerGravity.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.1"
                step="0.005"
                value={centerGravity}
                onChange={(e) => setCenterGravity(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Display Settings Section */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              Display & Nodes:
            </span>

            {/* Node Size Scale */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Node Scale:</span>
                <span className="text-white">{nodeScale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.0"
                step="0.1"
                value={nodeScale}
                onChange={(e) => setNodeScale(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Animate Pulses */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-zinc-300">Animate Link Pulses:</span>
              <button
                onClick={() => setAnimatePulses(!animatePulses)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  animatePulses
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
              >
                {animatePulses ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Left: Cluster Filter Pills */}
      <div className="absolute bottom-4 left-4 right-16 sm:right-auto flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => onSelectCluster && onSelectCluster(null)}
          className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono transition-all border ${
            !activeClusterFilter
              ? "bg-white text-black font-bold border-white shadow-sm"
              : "bg-zinc-900/85 text-zinc-400 border-zinc-800 hover:text-white"
          }`}
        >
          All ({RESUME_VECTOR_NODES.length})
        </button>
        {Object.entries(VECTOR_CLUSTERS).map(([key, cluster]) => {
          const isSelected = activeClusterFilter === key;
          const count = RESUME_VECTOR_NODES.filter((n) => n.cluster === key).length;
          return (
            <button
              key={key}
              onClick={() => onSelectCluster && onSelectCluster(isSelected ? null : key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono transition-all border ${
                isSelected
                  ? "bg-zinc-800 text-white font-bold border-zinc-500 shadow-md"
                  : "bg-zinc-900/85 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cluster.color }} />
              <span>
                {cluster.label} ({count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ObsidianGraphView;
