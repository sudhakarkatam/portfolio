import React from "react";
import { VectorNode } from "@/data/resumeVectorData";
import { TensorFlowProjectorView } from "./TensorFlowProjectorView";

interface VectorGraph3DProps {
  selectedNode: VectorNode | null;
  onSelectNode: (node: VectorNode | null) => void;
  highlightedNodeIds?: string[];
  activeClusterFilter?: string;
  onSelectCluster?: (cluster: string | null) => void;
}

export const VectorGraph3D: React.FC<VectorGraph3DProps> = ({
  selectedNode,
  onSelectNode,
  highlightedNodeIds = [],
  activeClusterFilter,
  onSelectCluster,
}) => {
  return (
    <TensorFlowProjectorView
      selectedNode={selectedNode}
      onSelectNode={onSelectNode}
      highlightedNodeIds={highlightedNodeIds}
      activeClusterFilter={activeClusterFilter}
      onSelectCluster={onSelectCluster}
    />
  );
};

export default VectorGraph3D;
