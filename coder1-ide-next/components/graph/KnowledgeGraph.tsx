'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { VaultGraphData } from '@/lib/vault-types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface KnowledgeGraphProps {
  onNodeClick?: (notePath: string) => void;
  activeNotePath?: string | null;
}

export default function KnowledgeGraph({ onNodeClick, activeNotePath }: KnowledgeGraphProps) {
  const [graphData, setGraphData] = useState<VaultGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    fetch('/api/vault/graph')
      .then((r) => r.json())
      .then((data: VaultGraphData) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (loading) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center h-full bg-[#0d0d0d] text-gray-500 text-sm"
      >
        Loading graph...
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full bg-[#0d0d0d] text-gray-500 gap-2"
      >
        <div className="text-2xl">🕸️</div>
        <div className="text-sm">No notes yet — create your first note!</div>
      </div>
    );
  }

  const fgData = {
    nodes: graphData.nodes.map((n) => ({
      id: n.id,
      name: n.title,
      path: n.path,
      val: Math.max(1, n.linkCount),
      color: n.path === activeNotePath ? '#f59e0b' : '#6366f1',
    })),
    links: graphData.links.map((l) => ({
      source: l.source,
      target: l.target,
      color: '#374151',
    })),
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0d0d0d]">
      <ForceGraph2D
        graphData={fgData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0d0d0d"
        nodeLabel="name"
        nodeColor="color"
        nodeVal="val"
        linkColor="color"
        warmupTicks={50}
        cooldownTicks={100}
        onNodeClick={(node: { path?: string }) => {
          if (node.path && onNodeClick) onNodeClick(node.path);
        }}
      />
    </div>
  );
}
