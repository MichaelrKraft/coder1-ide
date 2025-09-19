import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DependencyGraph.css';

interface DependencyNode {
    id: string;
    label: string;
    type: 'file' | 'function' | 'class';
    size: number;
    complexity?: number;
    x?: number;
    y?: number;
}

interface DependencyEdge {
    from: string;
    to: string;
    type: 'imports' | 'calls' | 'extends';
    weight: number;
}

interface DependencyGraphData {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    selectedFile?: string;
}

interface DependencyGraphProps {
    data?: DependencyGraphData;
    onNodeClick?: (node: DependencyNode) => void;
    onNodeHover?: (node: DependencyNode | null) => void;
    width?: number;
    height?: number;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ 
    data, 
    onNodeClick, 
    onNodeHover,
    width = 800,
    height = 600
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredNode, setHoveredNode] = useState<DependencyNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
    const [dragging, setDragging] = useState<{ node: DependencyNode; offsetX: number; offsetY: number } | null>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [nodes, setNodes] = useState<DependencyNode[]>([]);
    const [edges, setEdges] = useState<DependencyEdge[]>([]);
    const animationRef = useRef<number | null>(null);

    // Initialize force-directed layout
    useEffect(() => {
        if (!data) return;

        // Initialize node positions using force-directed layout
        const initializedNodes = data.nodes.map((node, index) => ({
            ...node,
            x: Math.cos(index * 2 * Math.PI / data.nodes.length) * 200 + width / 2,
            y: Math.sin(index * 2 * Math.PI / data.nodes.length) * 200 + height / 2
        }));

        setNodes(initializedNodes);
        setEdges(data.edges);

        // Start force simulation
        startForceSimulation(initializedNodes, data.edges);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [data, width, height]);

    // Force-directed layout simulation
    const startForceSimulation = useCallback((initialNodes: DependencyNode[], edges: DependencyEdge[]) => {
        let nodes = [...initialNodes];
        let velocities = nodes.map(() => ({ vx: 0, vy: 0 }));
        
        const simulate = () => {
            // Apply forces
            const alpha = 0.1;
            const centerForce = 0.01;
            const repulsionStrength = 1000;
            const linkStrength = 0.1;
            const damping = 0.9;

            // Center force
            const centerX = width / 2;
            const centerY = height / 2;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const velocity = velocities[i];

                // Center force
                velocity.vx += (centerX - node.x!) * centerForce;
                velocity.vy += (centerY - node.y!) * centerForce;

                // Repulsion force
                for (let j = 0; j < nodes.length; j++) {
                    if (i === j) continue;
                    const other = nodes[j];
                    const dx = node.x! - other.x!;
                    const dy = node.y! - other.y!;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = repulsionStrength / (distance * distance);
                    velocity.vx += (dx / distance) * force;
                    velocity.vy += (dy / distance) * force;
                }

                // Link forces
                edges.forEach(edge => {
                    if (edge.from === node.id) {
                        const target = nodes.find(n => n.id === edge.to);
                        if (target) {
                            const dx = target.x! - node.x!;
                            const dy = target.y! - node.y!;
                            velocity.vx += dx * linkStrength;
                            velocity.vy += dy * linkStrength;
                        }
                    }
                    if (edge.to === node.id) {
                        const source = nodes.find(n => n.id === edge.from);
                        if (source) {
                            const dx = source.x! - node.x!;
                            const dy = source.y! - node.y!;
                            velocity.vx += dx * linkStrength;
                            velocity.vy += dy * linkStrength;
                        }
                    }
                });

                // Apply damping
                velocity.vx *= damping;
                velocity.vy *= damping;

                // Update positions
                node.x = node.x! + velocity.vx * alpha;
                node.y = node.y! + velocity.vy * alpha;
            }

            setNodes([...nodes]);

            // Continue simulation if nodes are still moving significantly
            const totalKineticEnergy = velocities.reduce((sum, v) => sum + v.vx * v.vx + v.vy * v.vy, 0);
            if (totalKineticEnergy > 0.01) {
                animationRef.current = requestAnimationFrame(simulate);
            }
        };

        animationRef.current = requestAnimationFrame(simulate);
    }, [width, height]);

    // Draw the graph
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || nodes.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Apply transform
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);

        // Draw edges
        edges.forEach(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            
            if (!fromNode || !toNode || !fromNode.x || !fromNode.y || !toNode.x || !toNode.y) return;

            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            
            // Style based on edge type
            if (edge.type === 'imports') {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
            } else if (edge.type === 'calls') {
                ctx.strokeStyle = '#0066cc';
                ctx.lineWidth = 2;
            } else if (edge.type === 'extends') {
                ctx.strokeStyle = '#cc6600';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
            }
            
            ctx.globalAlpha = edge.weight || 0.6;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // Draw arrow
            const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            const arrowLength = 10;
            const arrowWidth = 5;
            
            ctx.save();
            ctx.translate(toNode.x, toNode.y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(-arrowLength, -arrowWidth);
            ctx.lineTo(0, 0);
            ctx.lineTo(-arrowLength, arrowWidth);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
            ctx.restore();
        });

        // Draw nodes
        nodes.forEach(node => {
            if (!node.x || !node.y) return;

            const isHovered = hoveredNode?.id === node.id;
            const isSelected = selectedNode?.id === node.id;
            
            // Calculate node size based on importance
            const baseSize = 8;
            const sizeMultiplier = Math.log(node.size + 1) * 2;
            const nodeSize = baseSize + sizeMultiplier;

            // Node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
            
            // Color based on type
            let fillColor = '#666';
            if (node.type === 'file') fillColor = '#4a90e2';
            else if (node.type === 'function') fillColor = '#7ed321';
            else if (node.type === 'class') fillColor = '#f5a623';
            
            // Complexity-based coloring for functions
            if (node.type === 'function' && node.complexity) {
                if (node.complexity > 10) fillColor = '#d0021b';
                else if (node.complexity > 5) fillColor = '#f8e71c';
            }
            
            if (isHovered || isSelected) {
                ctx.fillStyle = fillColor;
                ctx.strokeStyle = isSelected ? '#fff' : '#ccc';
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillStyle = fillColor;
                ctx.fill();
            }

            // Node label
            if (isHovered || isSelected || transform.scale > 1.5) {
                ctx.fillStyle = '#fff';
                ctx.font = `${12 / transform.scale}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(node.label, node.x, node.y + nodeSize + 15);
            }
        });

        ctx.restore();
    }, [nodes, edges, hoveredNode, selectedNode, transform]);

    // Mouse event handlers
    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - transform.x) / transform.scale;
        const mouseY = (event.clientY - rect.top - transform.y) / transform.scale;

        if (dragging) {
            // Update dragged node position
            const newNodes = [...nodes];
            const nodeIndex = newNodes.findIndex(n => n.id === dragging.node.id);
            if (nodeIndex !== -1) {
                newNodes[nodeIndex].x = mouseX - dragging.offsetX;
                newNodes[nodeIndex].y = mouseY - dragging.offsetY;
                setNodes(newNodes);
            }
            return;
        }

        // Find hovered node
        const hoveredNode = nodes.find(node => {
            if (!node.x || !node.y) return false;
            const distance = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
            const nodeSize = 8 + Math.log(node.size + 1) * 2;
            return distance <= nodeSize;
        });

        setHoveredNode(hoveredNode || null);
        onNodeHover?.(hoveredNode || null);
    }, [nodes, transform, dragging, onNodeHover]);

    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!hoveredNode) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - transform.x) / transform.scale;
        const mouseY = (event.clientY - rect.top - transform.y) / transform.scale;

        setDragging({
            node: hoveredNode,
            offsetX: mouseX - hoveredNode.x!,
            offsetY: mouseY - hoveredNode.y!
        });

        setSelectedNode(hoveredNode);
        onNodeClick?.(hoveredNode);
    }, [hoveredNode, transform, onNodeClick]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(3, transform.scale * delta));
        
        const newTransform = {
            scale: newScale,
            x: mouseX - (mouseX - transform.x) * (newScale / transform.scale),
            y: mouseY - (mouseY - transform.y) * (newScale / transform.scale)
        };

        setTransform(newTransform);
    }, [transform]);

    const resetView = () => {
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    const zoomToFit = () => {
        if (nodes.length === 0) return;

        const padding = 50;
        const minX = Math.min(...nodes.map(n => n.x! || 0));
        const maxX = Math.max(...nodes.map(n => n.x! || 0));
        const minY = Math.min(...nodes.map(n => n.y! || 0));
        const maxY = Math.max(...nodes.map(n => n.y! || 0));

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
        
        const scaleX = (width - padding * 2) / graphWidth;
        const scaleY = (height - padding * 2) / graphHeight;
        const scale = Math.min(scaleX, scaleY, 2);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setTransform({
            scale,
            x: width / 2 - centerX * scale,
            y: height / 2 - centerY * scale
        });
    };

    return (
        <div className="dependency-graph">
            <div className="graph-controls">
                <button onClick={resetView} className="control-btn">
                    🔄 Reset
                </button>
                <button onClick={zoomToFit} className="control-btn">
                    📐 Fit
                </button>
                <div className="zoom-info">
                    Zoom: {(transform.scale * 100).toFixed(0)}%
                </div>
            </div>
            
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: dragging ? 'grabbing' : hoveredNode ? 'grab' : 'default' }}
            />
            
            {hoveredNode && (
                <div className="node-tooltip" style={{
                    position: 'absolute',
                    left: (hoveredNode.x! * transform.scale + transform.x + 10) + 'px',
                    top: (hoveredNode.y! * transform.scale + transform.y - 10) + 'px',
                    pointerEvents: 'none'
                }}>
                    <div className="tooltip-header">
                        <span className={`node-type-icon ${hoveredNode.type}`}>
                            {hoveredNode.type === 'file' ? '📄' : 
                             hoveredNode.type === 'function' ? '⚡' : '📦'}
                        </span>
                        <strong>{hoveredNode.label}</strong>
                    </div>
                    <div className="tooltip-details">
                        <div>Type: {hoveredNode.type}</div>
                        {hoveredNode.complexity && (
                            <div>Complexity: {hoveredNode.complexity}</div>
                        )}
                        <div>Size: {hoveredNode.size}</div>
                    </div>
                </div>
            )}

            <div className="graph-legend">
                <h4>Legend</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-node file"></div>
                        <span>Files</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-node function"></div>
                        <span>Functions</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-node class"></div>
                        <span>Classes</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-edge imports"></div>
                        <span>Imports</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-edge calls"></div>
                        <span>Calls</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DependencyGraph;