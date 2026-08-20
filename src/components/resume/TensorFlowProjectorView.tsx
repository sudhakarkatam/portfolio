import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  VectorNode,
  RESUME_VECTOR_NODES,
  VECTOR_CLUSTERS,
} from "@/data/resumeVectorData";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Info,
  Crosshair,
  BarChart3,
  ExternalLink,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Camera,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TensorFlowProjectorViewProps {
  selectedNode: VectorNode | null;
  onSelectNode: (node: VectorNode | null) => void;
  highlightedNodeIds?: string[];
  activeClusterFilter?: string | null;
  onSelectCluster?: (cluster: string | null) => void;
}

interface ProjectedPoint {
  node: VectorNode;
  screenX: number;
  screenY: number;
  scale: number;
  depthZ: number;
  alpha: number;
  isHighlighted: boolean;
  isSelected: boolean;
  isDimmed: boolean;
}

export const TensorFlowProjectorView: React.FC<TensorFlowProjectorViewProps> = ({
  selectedNode,
  onSelectNode,
  highlightedNodeIds = [],
  activeClusterFilter,
  onSelectCluster,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D Camera & Rotation State
  const rotationRef = useRef({ rotX: 0.38, rotY: -0.42 });
  const targetRotationRef = useRef({ rotX: 0.38, rotY: -0.42 });
  const zoomRef = useRef(1.0);
  const targetZoomRef = useRef(1.0);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Touch pinch-to-zoom state
  const touchDistanceRef = useRef<number | null>(null);

  // Auto-play is OFF by default (user must click to enable)
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  autoRotateRef.current = autoRotate;

  const [currentZoomDisplay, setCurrentZoomDisplay] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [hoveredNode, setHoveredNode] = useState<VectorNode | null>(null);
  const hoveredNodeRef = useRef<VectorNode | null>(null);
  hoveredNodeRef.current = hoveredNode;

  // Projector HUD state
  const [showAxesBox, setShowAxesBox] = useState(true);
  const [showClusterRings, setShowClusterRings] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(true);
  const [showInspectorPanel, setShowInspectorPanel] = useState(true);
  const [projectionMode, setProjectionMode] = useState<"UMAP" | "PCA" | "t-SNE">("UMAP");

  // Keep projected points for mouse hit testing
  const projectedPointsRef = useRef<ProjectedPoint[]>([]);
  const isVisibleRef = useRef(true);

  // Pre-calculate Cluster Centers for 3D Cluster Boundaries
  const clusterCenters = useMemo(() => {
    const centers: Record<string, { x: number; y: number; z: number; count: number }> = {};
    RESUME_VECTOR_NODES.forEach((n) => {
      if (!centers[n.cluster]) {
        centers[n.cluster] = { x: 0, y: 0, z: 0, count: 0 };
      }
      centers[n.cluster].x += n.x;
      centers[n.cluster].y += n.y;
      centers[n.cluster].z += n.z;
      centers[n.cluster].count += 1;
    });

    return Object.entries(centers).map(([key, data]) => ({
      clusterKey: key,
      x: data.x / data.count,
      y: data.y / data.count,
      z: data.z / data.count,
      count: data.count,
      meta: VECTOR_CLUSTERS[key as keyof typeof VECTOR_CLUSTERS],
    }));
  }, []);

  // Calculate Nearest Neighbors to Selected Node (Mathematical Cosine Distance)
  const nearestNeighbors = useMemo(() => {
    if (!selectedNode) return [];

    const normA = Math.hypot(selectedNode.x, selectedNode.y, selectedNode.z) || 1;

    return RESUME_VECTOR_NODES.filter((n) => n.id !== selectedNode.id)
      .map((node) => {
        const normB = Math.hypot(node.x, node.y, node.z) || 1;
        const dot = selectedNode.x * node.x + selectedNode.y * node.y + selectedNode.z * node.z;
        const cosineSim = Math.max(-1, Math.min(1, dot / (normA * normB)));
        const cosineDist = 1 - cosineSim;
        const matchPct = Math.round(((cosineSim + 1) / 2) * 100);

        return {
          node,
          cosineDist,
          matchPct,
        };
      })
      .sort((a, b) => a.cosineDist - b.cosineDist)
      .slice(0, 5);
  }, [selectedNode]);

  // Smooth Camera Orientation when selectedNode changes (Preserves user's zoom level)
  useEffect(() => {
    if (selectedNode) {
      const angleY = Math.atan2(selectedNode.x, selectedNode.z);
      targetRotationRef.current.rotY = -angleY;
      targetRotationRef.current.rotX = Math.max(-0.35, Math.min(0.35, -selectedNode.y / 240));
    }
  }, [selectedNode]);

  // Keyboard Navigation (Arrow Keys, +, -, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "ArrowLeft") {
        targetRotationRef.current.rotY -= 0.15;
      } else if (e.key === "ArrowRight") {
        targetRotationRef.current.rotY += 0.15;
      } else if (e.key === "ArrowUp") {
        targetRotationRef.current.rotX = Math.min(Math.PI / 2.3, targetRotationRef.current.rotX + 0.12);
      } else if (e.key === "ArrowDown") {
        targetRotationRef.current.rotX = Math.max(-Math.PI / 2.3, targetRotationRef.current.rotX - 0.12);
      } else if (e.key === "+" || e.key === "=") {
        targetZoomRef.current = Math.min(3.0, targetZoomRef.current + 0.2);
        setCurrentZoomDisplay(Math.round(targetZoomRef.current * 100));
      } else if (e.key === "-" || e.key === "_") {
        targetZoomRef.current = Math.max(0.35, targetZoomRef.current - 0.2);
        setCurrentZoomDisplay(Math.round(targetZoomRef.current * 100));
      } else if (e.key === "Escape") {
        onSelectNode(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSelectNode]);

  // Fast 3D Canvas Projection
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisibleRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = containerRef.current;
    const rect = container ? container.getBoundingClientRect() : { width: canvas.clientWidth, height: canvas.clientHeight };
    const width = rect.width || 800;
    const height = rect.height || 560;

    // Clear entire canvas buffer using identity transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const centerX = width / 2;
    const centerY = height / 2;
    const cameraDistance = 480;
    const zoom = zoomRef.current;

    const rotX = rotationRef.current.rotX;
    const rotY = rotationRef.current.rotY;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    const project3D = (x: number, y: number, z: number) => {
      const x1 = x * cosY + z * sinY;
      const y1 = y;
      const z1 = -x * sinY + z * cosY;

      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      const depth = cameraDistance + z2;
      const scale = (cameraDistance / Math.max(depth, 30)) * zoom;
      return {
        sx: centerX + x2 * scale,
        sy: centerY + y2 * scale,
        scale,
        depthZ: z2,
      };
    };

    // 1. Draw Bounding Box & Origin Axes
    if (showAxesBox) {
      const boxSize = 220;
      const corners = [
        [-boxSize, -boxSize, -boxSize],
        [boxSize, -boxSize, -boxSize],
        [boxSize, boxSize, -boxSize],
        [-boxSize, boxSize, -boxSize],
        [-boxSize, -boxSize, boxSize],
        [boxSize, -boxSize, boxSize],
        [boxSize, boxSize, boxSize],
        [-boxSize, boxSize, boxSize],
      ];

      const projectedCorners = corners.map(([x, y, z]) => project3D(x, y, z));

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      ctx.save();
      ctx.strokeStyle = "rgba(100, 110, 140, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      edges.forEach(([i, j]) => {
        const p1 = projectedCorners[i];
        const p2 = projectedCorners[j];
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw Coordinate Origin Axes
      const origin = project3D(0, 0, 0);
      const axisLen = 130;
      const axisX = project3D(axisLen, 0, 0);
      const axisY = project3D(0, axisLen, 0);
      const axisZ = project3D(0, 0, axisLen);

      // X (Red)
      ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(axisX.sx, axisX.sy);
      ctx.stroke();

      // Y (Green)
      ctx.strokeStyle = "rgba(34, 197, 94, 0.55)";
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(axisY.sx, axisY.sy);
      ctx.stroke();

      // Z (Blue)
      ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(axisZ.sx, axisZ.sy);
      ctx.stroke();

      ctx.restore();
    }

    // 2. Draw Translucent 3D Cluster Boundaries / Rings
    if (showClusterRings) {
      ctx.save();
      clusterCenters.forEach((c) => {
        const p = project3D(c.x, c.y, c.z);
        if (p.scale <= 0) return;

        const isFiltered = activeClusterFilter && activeClusterFilter !== c.clusterKey;
        const ringRadius = 75 * p.scale;

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = isFiltered ? "rgba(0,0,0,0)" : c.meta.glow;
        ctx.globalAlpha = isFiltered ? 0.04 : 0.22;
        ctx.fill();

        ctx.strokeStyle = c.meta.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();
    }

    // 3. Project all Vector Nodes
    const hasHighlight = highlightedNodeIds.length > 0;
    const projected: ProjectedPoint[] = [];

    RESUME_VECTOR_NODES.forEach((node) => {
      let nx = node.x;
      let ny = node.y;
      let nz = node.z;

      if (projectionMode === "PCA") {
        nx = node.x * 1.15;
        ny = node.y * 0.85;
        nz = node.z * 0.95;
      } else if (projectionMode === "t-SNE") {
        nx = node.x * 0.92 + Math.sin(node.y * 0.05) * 20;
        ny = node.y * 1.1 + Math.cos(node.x * 0.05) * 20;
        nz = node.z * 0.95;
      }

      const p = project3D(nx, ny, nz);
      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = highlightedNodeIds.includes(node.id);
      const isClusterMatch = !activeClusterFilter || node.cluster === activeClusterFilter;

      let isDimmed = false;
      if (hasHighlight && !isHighlighted && !isSelected) isDimmed = true;
      if (activeClusterFilter && !isClusterMatch && !isSelected) isDimmed = true;

      const alpha = isDimmed ? 0.16 : 0.95;

      projected.push({
        node,
        screenX: p.sx,
        screenY: p.sy,
        scale: p.scale,
        depthZ: p.depthZ,
        alpha,
        isHighlighted,
        isSelected,
        isDimmed,
      });
    });

    projectedPointsRef.current = projected;

    // Depth Sorting
    const sortedPoints = [...projected].sort((a, b) => b.depthZ - a.depthZ);
    const nodeMap = new Map<string, ProjectedPoint>();
    projected.forEach((p) => nodeMap.set(p.node.id, p));

    // 4. Draw Links
    ctx.save();
    RESUME_VECTOR_NODES.forEach((node) => {
      const sourcePt = nodeMap.get(node.id);
      if (!sourcePt) return;

      node.connections.forEach((targetId) => {
        if (targetId < node.id) return;
        const targetPt = nodeMap.get(targetId);
        if (!targetPt) return;

        const isLinkSelected = sourcePt.isSelected || targetPt.isSelected;
        const isLinkHighlighted = sourcePt.isHighlighted && targetPt.isHighlighted;
        const isDimmed = sourcePt.isDimmed || targetPt.isDimmed;

        ctx.beginPath();
        ctx.moveTo(sourcePt.screenX, sourcePt.screenY);
        ctx.lineTo(targetPt.screenX, targetPt.screenY);

        if (isLinkSelected || isLinkHighlighted) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.85 * Math.min(sourcePt.alpha, targetPt.alpha)})`;
          ctx.lineWidth = 1.8;
        } else if (isDimmed) {
          ctx.strokeStyle = "rgba(100, 100, 130, 0.04)";
          ctx.lineWidth = 0.5;
        } else {
          ctx.strokeStyle = `rgba(140, 150, 180, ${0.15 * Math.min(sourcePt.alpha, targetPt.alpha)})`;
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      });
    });

    // Draw Target Laser Beams to Top Neighbors
    if (selectedNode) {
      const selPt = nodeMap.get(selectedNode.id);
      if (selPt) {
        nearestNeighbors.forEach((nn) => {
          const targetPt = nodeMap.get(nn.node.id);
          if (!targetPt) return;

          ctx.beginPath();
          ctx.moveTo(selPt.screenX, selPt.screenY);
          ctx.lineTo(targetPt.screenX, targetPt.screenY);
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.85 - nn.cosineDist * 0.4})`;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }
    }
    ctx.restore();

    // 5. Draw Vector Points & Labels
    sortedPoints.forEach((p) => {
      const { node, screenX, screenY, scale, alpha, isSelected, isHighlighted, isDimmed } = p;
      const isHovered = hoveredNodeRef.current?.id === node.id;
      const baseRadius = node.size * 0.42 * scale;
      const radius = Math.max(3.5, isSelected ? baseRadius * 1.5 : isHovered ? baseRadius * 1.3 : baseRadius);

      ctx.save();
      ctx.globalAlpha = Math.max(0.12, alpha);

      // Fast Radial Halo Glow
      if (isSelected || isHighlighted || isHovered) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = node.glowColor;
        ctx.fill();
      }

      // Vector Point Body
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#ffffff" : node.color;
      ctx.fill();

      ctx.strokeStyle = isSelected ? node.color : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Label
      const shouldShowLabel =
        isSelected ||
        isHovered ||
        isHighlighted ||
        (showAllLabels && !isDimmed) ||
        (scale > 0.9 && !isDimmed);

      if (shouldShowLabel) {
        ctx.font = `${isSelected || isHovered ? "bold 11px" : "10px"} font-mono, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const textY = screenY + radius + 5;
        const text = node.label;
        const textWidth = ctx.measureText(text).width;

        ctx.fillStyle = isSelected
          ? "rgba(10, 10, 15, 0.95)"
          : isHighlighted
          ? "rgba(20, 15, 35, 0.9)"
          : "rgba(12, 12, 18, 0.85)";
        ctx.beginPath();
        ctx.roundRect(screenX - textWidth / 2 - 5, textY - 2, textWidth + 10, 16, 4);
        ctx.fill();
        ctx.strokeStyle = isSelected
          ? "#ffffff"
          : isHighlighted
          ? node.color
          : "rgba(255,255,255,0.18)";
        ctx.lineWidth = isSelected ? 1.5 : 0.8;
        ctx.stroke();

        ctx.fillStyle = isSelected
          ? "#ffffff"
          : isHighlighted
          ? "#f3e8ff"
          : "rgba(245, 245, 255, 0.95)";
        ctx.fillText(text, screenX, textY);
      }

      ctx.restore();
    });
  }, [
    highlightedNodeIds,
    selectedNode,
    activeClusterFilter,
    showAxesBox,
    showClusterRings,
    showAllLabels,
    projectionMode,
    nearestNeighbors,
    clusterCenters,
  ]);

  // Smooth render loop with IntersectionObserver
  useEffect(() => {
    let animationFrameId: number;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const render = () => {
      if (isVisibleRef.current) {
        if (autoRotateRef.current && !isDraggingRef.current) {
          targetRotationRef.current.rotY += 0.002;
        }

        rotationRef.current.rotX += (targetRotationRef.current.rotX - rotationRef.current.rotX) * 0.08;
        rotationRef.current.rotY += (targetRotationRef.current.rotY - rotationRef.current.rotY) * 0.08;
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.08;

        drawCanvas();
      }
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [drawCanvas]);

  // Handle Resize with DPR Clamping
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
      }
      drawCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawCanvas, isFullscreen]);

  // Native Non-Passive Wheel Listener (Fixes page zoom vs canvas zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomDelta = e.deltaY * -0.0018;
      targetZoomRef.current = Math.max(0.35, Math.min(3.0, targetZoomRef.current + zoomDelta));
      setCurrentZoomDisplay(Math.round(targetZoomRef.current * 100));
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleNativeWheel);
  }, []);

  // Native Multi-Touch Handling (1 Finger = Orbit, 2 Fingers = Pinch Zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchDistanceRef.current = null;
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDistanceRef.current = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1 && isDraggingRef.current) {
        const deltaX = e.touches[0].clientX - lastMousePosRef.current.x;
        const deltaY = e.touches[0].clientY - lastMousePosRef.current.y;

        targetRotationRef.current.rotY += deltaX * 0.008;
        targetRotationRef.current.rotX = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, targetRotationRef.current.rotX + deltaY * 0.008)
        );

        lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const distDelta = (newDist - touchDistanceRef.current) * 0.005;

        targetZoomRef.current = Math.max(0.35, Math.min(3.0, targetZoomRef.current + distDelta));
        touchDistanceRef.current = newDist;
        setCurrentZoomDisplay(Math.round(targetZoomRef.current * 100));
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      touchDistanceRef.current = null;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  // Mouse Orbit Controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;

      targetRotationRef.current.rotY += deltaX * 0.008;
      targetRotationRef.current.rotX = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, targetRotationRef.current.rotX + deltaY * 0.008)
      );

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hover test
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let foundNode: VectorNode | null = null;
      for (const p of projectedPointsRef.current) {
        const dist = Math.hypot(p.screenX - mouseX, p.screenY - mouseY);
        if (dist <= p.node.size * 0.9 * p.scale + 8) {
          foundNode = p.node;
          break;
        }
      }
      setHoveredNode(foundNode);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let clickedNode: VectorNode | null = null;
    for (const p of projectedPointsRef.current) {
      const dist = Math.hypot(p.screenX - mouseX, p.screenY - mouseY);
      if (dist <= p.node.size * 0.9 * p.scale + 8) {
        clickedNode = p.node;
        break;
      }
    }

    onSelectNode(clickedNode);
  };

  const handleZoomDelta = (delta: number) => {
    targetZoomRef.current = Math.max(0.35, Math.min(3.0, targetZoomRef.current + delta));
    setCurrentZoomDisplay(Math.round(targetZoomRef.current * 100));
  };

  const handleResetCamera = () => {
    targetRotationRef.current = { rotX: 0.38, rotY: -0.42 };
    targetZoomRef.current = 1.0;
    setCurrentZoomDisplay(100);
    onSelectNode(null);
  };

  // Export Snapshot as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `sudhakar-rag-vector-space-${projectionMode}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className={`relative w-full rounded-3xl overflow-hidden bg-[#07070a] border border-zinc-800 shadow-2xl select-none transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-4 z-50 h-[calc(100vh-2rem)]"
            : "h-[520px] sm:h-[620px]"
        }`}
      >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing block touch-none"
      />

      {/* Top Left: 3D Vector Space Header */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-purple-500/30 text-xs font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-bold text-white tracking-wider">3D RAG VECTOR SPACE</span>
          <span className="text-zinc-600">|</span>
          <span className="text-purple-300 font-semibold">{projectionMode}</span>
        </div>

        {/* Projection Switcher (UMAP / PCA / t-SNE) */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-md pointer-events-auto">
          {(["UMAP", "PCA", "t-SNE"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setProjectionMode(mode)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-colors ${
                projectionMode === mode
                  ? "bg-purple-600 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right: Controls (Labels, Cluster Rings, Bounding Box, Export PNG, Fullscreen) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => setShowAllLabels(!showAllLabels)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-mono border backdrop-blur-md transition-colors ${
            showAllLabels
              ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
          title="Toggle All Embedding Labels"
        >
          <span>Labels: {showAllLabels ? "ON" : "OFF"}</span>
        </button>

        <button
          onClick={() => setShowClusterRings(!showClusterRings)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono border backdrop-blur-md transition-colors ${
            showClusterRings
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
          title="Toggle 3D Semantic Cluster Boundaries"
        >
          <Layers size={12} />
          <span className="hidden sm:inline">Clusters</span>
        </button>

        <button
          onClick={() => setShowAxesBox(!showAxesBox)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono border backdrop-blur-md transition-colors ${
            showAxesBox
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
          title="Toggle 3D Bounding Box & Axes"
        >
          <Crosshair size={12} />
        </button>

        <button
          onClick={handleExportPNG}
          className="p-2 rounded-xl text-xs border bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white backdrop-blur-md transition-colors"
          title="Export 3D Embedding Space as PNG Snapshot"
        >
          <Camera size={14} />
        </button>

        <button
          onClick={() => setShowInspectorPanel(!showInspectorPanel)}
          className={`p-2 rounded-xl text-xs border backdrop-blur-md transition-colors ${
            showInspectorPanel
              ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
              : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
          title="Toggle Nearest Neighbors Inspector"
        >
          <BarChart3 size={14} />
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl text-xs border bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white backdrop-blur-md transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Expand Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* Right Drawer: TensorFlow Nearest Neighbors Inspector */}
      <AnimatePresence>
        {showInspectorPanel && selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-16 right-4 bottom-20 w-72 p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-xl shadow-2xl flex flex-col justify-between overflow-y-auto pointer-events-auto z-20"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-purple-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Nearest Neighbors
                  </span>
                </div>
                <button
                  onClick={() => onSelectNode(null)}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-500">Selected Point:</div>
                <div className="font-bold text-sm text-white flex items-center gap-2 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedNode.color }}
                  />
                  <span className="truncate">{selectedNode.label}</span>
                </div>
              </div>

              {/* Neighbors list with Cosine Distance */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex justify-between">
                  <span>Target Node</span>
                  <span>Cosine Dist</span>
                </div>

                <div className="space-y-1.5">
                  {nearestNeighbors.map((nn) => (
                    <div
                      key={nn.node.id}
                      onClick={() => onSelectNode(nn.node)}
                      className="p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-purple-500/40 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200 truncate max-w-[150px]">
                          {nn.node.label}
                        </span>
                        <span className="font-mono text-[11px] text-purple-400 font-bold">
                          {nn.cosineDist.toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${nn.matchPct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-500 space-y-1">
              <div>Metric: Cosine Distance (0.000 = exact)</div>
              <div>Keyboard: Arrow Keys / +/- / Esc</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* ── External Control Dock: Placed Below 3D Canvas so Vector Space is 100% Clear ── */}
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#0c0c10] border border-zinc-200 dark:border-zinc-800/80 shadow-md">
      {/* Cluster Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => onSelectCluster && onSelectCluster(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            !activeClusterFilter
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          All ({RESUME_VECTOR_NODES.length})
        </button>

        {Object.entries(VECTOR_CLUSTERS).map(([key, cluster]) => {
          const count = RESUME_VECTOR_NODES.filter((n) => n.cluster === key).length;
          const isSelected = activeClusterFilter === key;

          return (
            <button
              key={key}
              onClick={() => onSelectCluster && onSelectCluster(isSelected ? null : key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                isSelected
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-sm border border-zinc-300 dark:border-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cluster.color }}
              />
              <span className="hidden sm:inline">{cluster.label}</span>
              <span className="text-[10px] text-zinc-400">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Orbit, Zoom & Reset Camera Controls */}
      <div className="flex items-center justify-end gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Orbit Button */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            autoRotate
              ? "bg-purple-600 text-white font-bold shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
          title={autoRotate ? "Orbit is Running (Click to Pause)" : "Orbit is Paused (Click to Play)"}
        >
          {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          <span>Orbit: {autoRotate ? "ON" : "OFF"}</span>
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoomDelta(-0.25)}
          className="p-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          title="Zoom Out (or scroll wheel over canvas)"
        >
          <ZoomOut size={14} />
        </button>

        {/* Zoom Level Readout */}
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold px-1.5 min-w-[42px] text-center">
          {currentZoomDisplay}%
        </span>

        {/* Zoom In */}
        <button
          onClick={() => handleZoomDelta(0.25)}
          className="p-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          title="Zoom In (or scroll wheel over canvas)"
        >
          <ZoomIn size={14} />
        </button>

        {/* Reset Camera */}
        <button
          onClick={handleResetCamera}
          className="p-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          title="Reset Camera & Zoom"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  </div>
);
};

export default TensorFlowProjectorView;
