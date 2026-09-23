import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  VectorNode,
  RESUME_VECTOR_NODES,
  VECTOR_CLUSTERS,
} from "@/data/resumeVectorData";
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Share2,
  Camera,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  X,
  CheckCircle2,
  Bookmark,
  Filter,
} from "lucide-react";

interface ObsidianGraphViewProps {
  selectedNode: VectorNode | null;
  onSelectNode: (node: VectorNode | null) => void;
  highlightedNodeIds?: string[];
  activeClusterFilter?: string | null;
  onSelectCluster?: (cluster: string | null) => void;
}

interface PhysicsNode {
  data: VectorNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  radius: number;
  degree: number;
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

  // Optimized physics parameters for wide, spacious layout
  const [repelForce, setRepelForce] = useState(280);
  const [linkDistance, setLinkDistance] = useState(170);
  const [centerGravity, setCenterGravity] = useState(0.0035); // 10x gentler gravity so nodes don't collapse
  const [showAllLabels, setShowAllLabels] = useState(false); // Smart LOD: hover/select highlights labels
  const [showClusterLabels, setShowClusterLabels] = useState(true);
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pan & Zoom
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(0.85); // Start slightly zoomed out so full constellation is visible
  const targetZoomRef = useRef(0.85);
  const [currentZoomDisplay, setCurrentZoomDisplay] = useState(85);

  // Interaction tracking
  const isPanningRef = useRef(false);
  const isDraggingNodeRef = useRef<PhysicsNode | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const [hoveredNode, setHoveredNode] = useState<VectorNode | null>(null);
  const hoveredNodeRef = useRef<VectorNode | null>(null);
  hoveredNodeRef.current = hoveredNode;

  // Pulse animation phase
  const pulsePhaseRef = useRef(0);

  // Graph state
  const physicsGraphRef = useRef<{ nodes: PhysicsNode[]; links: PhysicsLink[] }>({
    nodes: [],
    links: [],
  });

  // Calculate degree for each node
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    RESUME_VECTOR_NODES.forEach((n) => {
      counts[n.id] = n.connections.length;
      n.connections.forEach((connId) => {
        counts[connId] = (counts[connId] || 0) + 1;
      });
    });
    return counts;
  }, []);

  // Initialize nodes with wide initial spacing
  useEffect(() => {
    const nodeMap = new Map<string, PhysicsNode>();

    const nodes: PhysicsNode[] = RESUME_VECTOR_NODES.map((node) => {
      const degree = connectionCounts[node.id] || 1;
      // Multiply initial coordinates by 2.6 for wide, comfortable spacing across the canvas
      const pn: PhysicsNode = {
        data: node,
        x: node.x * 2.6 + (Math.random() - 0.5) * 40,
        y: node.y * 2.6 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.max(6, Math.min(13, 5 + Math.sqrt(degree) * 2.2)),
        degree,
      };
      nodeMap.set(node.id, pn);
      return pn;
    });

    const links: PhysicsLink[] = [];
    const seenEdges = new Set<string>();

    RESUME_VECTOR_NODES.forEach((source) => {
      const srcNode = nodeMap.get(source.id);
      if (!srcNode) return;

      source.connections.forEach((targetId) => {
        const tgtNode = nodeMap.get(targetId);
        if (!tgtNode) return;

        const edgeKey = [source.id, targetId].sort().join("<->");
        if (seenEdges.has(edgeKey)) return;
        seenEdges.add(edgeKey);

        links.push({
          source: srcNode,
          target: tgtNode,
          distance: 170,
        });
      });
    });

    physicsGraphRef.current = { nodes, links };
  }, [connectionCounts]);

  // Force-Directed Physics Simulation with Collision Prevention
  const stepPhysics = useCallback(() => {
    if (!isPhysicsRunning) return;
    const { nodes, links } = physicsGraphRef.current;
    const count = nodes.length;
    if (count === 0) return;

    // 1. Coulomb Repulsion + Anti-Collision Buffer
    const k = repelForce * 24;
    const minCollisionDist = 130; // Minimum distance between any two nodes to prevent label overlap

    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < count; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        if (dist > 700) continue; // Distance cutoff

        // Standard inverse-square repulsion
        const force = k / (distSq + 200);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;

        // Anti-collision strong spring push if too close
        if (dist < minCollisionDist) {
          const push = ((minCollisionDist - dist) / minCollisionDist) * 3.5;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
        }

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

    // 2. Hooke's Law Spring Links
    const springK = 0.035;
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

    // 3. Gentle Center Gravity & Friction
    const friction = 0.85;
    nodes.forEach((node) => {
      if (node.fx !== undefined && node.fx !== null) {
        node.x = node.fx;
        node.y = node.fy!;
        node.vx = 0;
        node.vy = 0;
        return;
      }

      // Very gentle gravity pull towards center (0, 0)
      node.vx -= node.x * centerGravity;
      node.vy -= node.y * centerGravity;

      node.vx *= friction;
      node.vy *= friction;

      // Clamp max velocity
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > 12) {
        node.vx = (node.vx / speed) * 12;
        node.vy = (node.vy / speed) * 12;
      }

      node.x += node.vx;
      node.y += node.vy;
    });
  }, [repelForce, linkDistance, centerGravity, isPhysicsRunning]);

  // Main Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      pulsePhaseRef.current = (pulsePhaseRef.current + 0.012) % 1;
      zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.12;
      setCurrentZoomDisplay(Math.round(zoomRef.current * 100));

      stepPhysics();
      drawCanvas();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [stepPhysics]);

  // Draw Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
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
      return (
        activeHovered.connections.includes(nodeId) ||
        RESUME_VECTOR_NODES.find((n) => n.id === nodeId)?.connections.includes(activeHovered.id) ||
        false
      );
    };

    // Helper: is connected to selected node
    const isNeighborOfSelected = (nodeId: string) => {
      if (!selectedNode) return false;
      if (selectedNode.id === nodeId) return true;
      return (
        selectedNode.connections.includes(nodeId) ||
        RESUME_VECTOR_NODES.find((n) => n.id === nodeId)?.connections.includes(selectedNode.id) ||
        false
      );
    };

    // ── 1. Cosmic Coordinate Dot Grid ──
    const gridSize = 45 * zoom;
    const startX = ((centerX % gridSize) + gridSize) % gridSize;
    const startY = ((centerY % gridSize) + gridSize) % gridSize;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    for (let gx = startX; gx < width; gx += gridSize) {
      for (let gy = startY; gy < height; gy += gridSize) {
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }
    }

    // ── 2. Cluster Region Labels Floating in Background ──
    if (showClusterLabels) {
      const clusterCenters: Record<string, { x: number; y: number; count: number }> = {};
      nodes.forEach((n) => {
        const c = n.data.cluster;
        if (!clusterCenters[c]) clusterCenters[c] = { x: 0, y: 0, count: 0 };
        clusterCenters[c].x += n.x;
        clusterCenters[c].y += n.y;
        clusterCenters[c].count += 1;
      });

      Object.entries(clusterCenters).forEach(([clusterKey, center]) => {
        if (center.count === 0) return;
        const avgX = centerX + (center.x / center.count) * zoom;
        const avgY = centerY + (center.y / center.count) * zoom;
        const clusterInfo = VECTOR_CLUSTERS[clusterKey as keyof typeof VECTOR_CLUSTERS];
        if (!clusterInfo) return;

        const isClusterActive = !hasClusterFilter || activeClusterFilter === clusterKey;

        ctx.save();
        ctx.font = `700 ${Math.max(11, 14 * zoom)}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isClusterActive ? clusterInfo.color : "rgba(100, 100, 120, 0.15)";
        ctx.globalAlpha = isClusterActive ? 0.22 : 0.04;
        ctx.fillText(`✦ ${clusterInfo.label.toUpperCase()}`, avgX, avgY - 50 * zoom);
        ctx.restore();
      });
    }

    // ── 3. Draw Synaptic Links ──
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
        ? (activeHovered.id === srcNode.id && isNeighborOfHovered(tgtNode.id)) ||
          (activeHovered.id === tgtNode.id && isNeighborOfHovered(srcNode.id))
        : false;

      const isConnectedToSelected = selectedNode
        ? (selectedNode.id === srcNode.id && isNeighborOfSelected(tgtNode.id)) ||
          (selectedNode.id === tgtNode.id && isNeighborOfSelected(srcNode.id))
        : false;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);

      if (isConnectedToHover || isConnectedToSelected || isSrcSelected || isTgtSelected) {
        ctx.strokeStyle = isSrcSelected || isTgtSelected
          ? "rgba(255, 255, 255, 0.9)"
          : link.source.data.color || "#c084fc";
        ctx.lineWidth = Math.max(2.0, 2.5 * zoom);
        ctx.shadowColor = link.source.data.glowColor || "rgba(168, 85, 247, 0.5)";
        ctx.shadowBlur = 8;
      } else if (isSrcHighlighted && isTgtHighlighted) {
        ctx.strokeStyle = "rgba(192, 132, 252, 0.85)";
        ctx.lineWidth = Math.max(1.8, 2.2 * zoom);
        ctx.shadowColor = "#c084fc";
        ctx.shadowBlur = 6;
      } else if (activeHovered && !isConnectedToHover) {
        ctx.strokeStyle = "rgba(70, 70, 90, 0.05)";
        ctx.lineWidth = 0.5;
        ctx.shadowBlur = 0;
      } else if (hasClusterFilter) {
        const matchesCluster =
          srcNode.cluster === activeClusterFilter && tgtNode.cluster === activeClusterFilter;
        ctx.strokeStyle = matchesCluster
          ? "rgba(160, 175, 210, 0.4)"
          : "rgba(70, 70, 90, 0.06)";
        ctx.lineWidth = matchesCluster ? 1.2 * zoom : 0.5;
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = "rgba(130, 140, 170, 0.16)";
        ctx.lineWidth = Math.max(0.6, 0.8 * zoom);
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Energy Pulse traveling along active synapses
      if (
        (isConnectedToHover || isConnectedToSelected || isSrcSelected || isTgtSelected || (isSrcHighlighted && isTgtHighlighted))
      ) {
        const progress = pulsePhaseRef.current;
        const px = sx + (tx - sx) * progress;
        const py = sy + (ty - sy) * progress;

        ctx.beginPath();
        ctx.arc(px, py, Math.max(2.5, 3.2 * zoom), 0, Math.PI * 2);
        ctx.fillStyle = isConnectedToHover || isSrcSelected ? "#ffffff" : "#c084fc";
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    ctx.restore();

    // ── 4. Draw Nodes ──
    nodes.forEach((pn) => {
      const node = pn.data;
      const sx = centerX + pn.x * zoom;
      const sy = centerY + pn.y * zoom;

      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = highlightedNodeIds.includes(node.id);
      const isHovered = activeHovered?.id === node.id;
      const isClusterMatch = !activeClusterFilter || node.cluster === activeClusterFilter;
      const isNeighbor = activeHovered ? isNeighborOfHovered(node.id) : selectedNode ? isNeighborOfSelected(node.id) : true;

      let isDimmed = false;
      if (hasHighlight && !isHighlighted && !isSelected) isDimmed = true;
      if (hasClusterFilter && !isClusterMatch && !isSelected) isDimmed = true;
      if (activeHovered && !isNeighbor) isDimmed = true;

      const baseRadius = pn.radius * zoom;
      const radius = Math.max(
        4.5,
        isSelected
          ? baseRadius * 1.6
          : isHovered
          ? baseRadius * 1.45
          : isHighlighted
          ? baseRadius * 1.3
          : baseRadius
      );

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.12 : 1.0;

      // Glow Halo
      if (isSelected || isHighlighted || isHovered) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 3.0, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(sx, sy, radius * 0.3, sx, sy, radius * 3.0);
        glowGrad.addColorStop(0, node.glowColor || "rgba(168, 85, 247, 0.6)");
        glowGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }

      // Outer Dashed Orbit Ring for Selected Node
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius * 2.0, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#ffffff" : node.color;
      ctx.fill();

      // Inner Core Dot
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, radius * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? node.color : "rgba(255, 255, 255, 0.9)";
      ctx.fill();

      // Border Ring
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected
        ? node.color
        : isHovered
        ? "#ffffff"
        : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
      ctx.stroke();

      // ── Smart Level-of-Detail (LOD) Labels ──
      // To prevent label clumping, ONLY show labels when:
      // 1. ShowAllLabels is toggled ON
      // 2. Node is Hovered or Selected
      // 3. Node is an immediate neighbor of Hovered/Selected
      // 4. Node is highlighted by search query
      // 5. Or when zoomed in (zoom > 1.25)
      const isHub = pn.degree >= 5;
      const shouldShowLabel =
        showAllLabels ||
        isSelected ||
        isHovered ||
        isHighlighted ||
        (activeHovered && isNeighborOfHovered(node.id)) ||
        (selectedNode && isNeighborOfSelected(node.id)) ||
        (!isDimmed && (zoom > 1.25 || (zoom > 0.95 && isHub)));

      if (shouldShowLabel) {
        ctx.font = `${
          isSelected || isHovered
            ? "bold 11px"
            : isHub
            ? "600 10.5px"
            : "10px"
        } "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const textY = sy + radius + 5;
        const text = node.label;
        const textWidth = ctx.measureText(text).width;

        // Label Pill Background
        ctx.fillStyle = isSelected
          ? "rgba(12, 12, 18, 0.95)"
          : isHighlighted
          ? "rgba(25, 18, 42, 0.92)"
          : "rgba(9, 9, 14, 0.88)";
        ctx.beginPath();
        ctx.roundRect(sx - textWidth / 2 - 5, textY - 2, textWidth + 10, 16, 4);
        ctx.fill();

        // Label Border
        ctx.strokeStyle = isSelected
          ? "#ffffff"
          : isHighlighted
          ? node.color
          : isHovered
          ? "rgba(255, 255, 255, 0.6)"
          : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = isSelected ? 1.5 : isHighlighted ? 1.2 : 0.8;
        ctx.stroke();

        // Label Text
        ctx.fillStyle = isSelected
          ? "#ffffff"
          : isHighlighted
          ? "#f3e8ff"
          : isHovered
          ? "#ffffff"
          : "rgba(235, 235, 250, 0.88)";
        ctx.fillText(text, sx, textY);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [
    highlightedNodeIds,
    selectedNode,
    activeClusterFilter,
    showAllLabels,
    showClusterLabels,
  ]);

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

  // Pointer & Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    const centerX = canvas.width / (2 * (window.devicePixelRatio || 1)) + panRef.current.x;
    const centerY = canvas.height / (2 * (window.devicePixelRatio || 1)) + panRef.current.y;
    const zoom = zoomRef.current;

    const { nodes } = physicsGraphRef.current;
    let clickedNode: PhysicsNode | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const pn = nodes[i];
      const sx = centerX + pn.x * zoom;
      const sy = centerY + pn.y * zoom;
      const dist = Math.hypot(sx - mouseX, sy - mouseY);
      if (dist <= pn.radius * 2.8 * zoom + 8) {
        clickedNode = pn;
        break;
      }
    }

    if (clickedNode) {
      isDraggingNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      onSelectNode(clickedNode.data);
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
      if (dist <= pn.radius * 2.8 * zoom + 8) {
        hit = pn.data;
        break;
      }
    }
    setHoveredNode(hit);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const movedDist = Math.hypot(
      e.clientX - dragStartPosRef.current.x,
      e.clientY - dragStartPosRef.current.y
    );

    if (isDraggingNodeRef.current) {
      const dragged = isDraggingNodeRef.current;
      isDraggingNodeRef.current = null;
      dragged.fx = null;
      dragged.fy = null;

      if (movedDist < 6) {
        onSelectNode(dragged.data);
      }
      return;
    }

    if (isPanningRef.current && movedDist < 4) {
      onSelectNode(null);
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0014;
    targetZoomRef.current = Math.max(0.35, Math.min(2.8, targetZoomRef.current + delta));
  };

  const handleZoomDelta = (delta: number) => {
    targetZoomRef.current = Math.max(0.35, Math.min(2.8, targetZoomRef.current + delta));
  };

  const handleResetGraph = () => {
    panRef.current = { x: 0, y: 0 };
    targetZoomRef.current = 0.85;
    setIsPhysicsRunning(true);
    onSelectNode(null);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `sudhakar-neural-knowledge-graph.png`;
    link.href = dataUrl;
    link.click();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[520px] flex-1">
      {/* ── Main Canvas Viewport ── */}
      <div
        ref={containerRef}
        className={`relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden bg-[#07070b] border border-zinc-800/80 shadow-2xl select-none transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 z-50 h-screen rounded-none"
            : "h-full"
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block touch-none"
        />

        {/* Top Left: Graph Title & Constellation Badge */}
        <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-purple-500/30 text-xs font-mono text-zinc-300 shadow-lg">
            <Share2 size={13} className="text-purple-400" />
            <span className="font-bold text-white tracking-wider">NEURAL KNOWLEDGE GRAPH</span>
            <span className="text-zinc-600">|</span>
            <span className="text-purple-300 font-semibold">{RESUME_VECTOR_NODES.length} Nodes</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/70 px-3 py-1 rounded-full border border-zinc-800 backdrop-blur-sm">
            <span>Hover to isolate synapses • Click to open details</span>
          </div>
        </div>

        {/* Top Right: Streamlined Canvas HUD Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 pointer-events-auto">
          {/* Cluster Filter Dropdown Pill */}
          <div className="relative">
            <select
              value={activeClusterFilter || ""}
              onChange={(e) => onSelectCluster && onSelectCluster(e.target.value || null)}
              className="bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer backdrop-blur-md transition-colors"
            >
              <option value="">All Clusters ({RESUME_VECTOR_NODES.length})</option>
              {Object.entries(VECTOR_CLUSTERS).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.label} ({RESUME_VECTOR_NODES.filter((n) => n.cluster === key).length})
                </option>
              ))}
            </select>
          </div>

          {/* Smart Labels Toggle */}
          <button
            onClick={() => setShowAllLabels(!showAllLabels)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono border backdrop-blur-md transition-colors ${
              showAllLabels
                ? "bg-purple-600 text-white border-purple-500 font-bold shadow-sm"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
            title="Toggle All Labels (Off = Smart Neighborhood Focus)"
          >
            Labels: {showAllLabels ? "ALL" : "SMART"}
          </button>

          {/* Physics Live/Pause */}
          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-colors ${
              !isPhysicsRunning
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
            title={isPhysicsRunning ? "Pause Physics Simulation" : "Resume Physics Simulation"}
          >
            {isPhysicsRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => handleZoomDelta(-0.25)}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors backdrop-blur-md"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => handleZoomDelta(0.25)}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors backdrop-blur-md"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetGraph}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors backdrop-blur-md"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors backdrop-blur-md"
            title="Export PNG Image"
          >
            <Camera size={14} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors backdrop-blur-md"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObsidianGraphView;
