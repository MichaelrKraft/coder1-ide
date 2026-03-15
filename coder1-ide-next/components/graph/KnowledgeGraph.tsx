'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VaultGraphData, VaultGraphNode } from '@/lib/vault-types';

interface ClusterResult {
  id: string;
  label: string;
  color: string;
  nodeIds: number[];
}

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
  const [clusterMode, setClusterMode] = useState(false);
  const [clusters, setClusters] = useState<ClusterResult[] | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);

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

  const fetchClusters = useCallback(async () => {
    if (!graphData?.nodes?.length) return;
    setClusterLoading(true);
    try {
      const res = await fetch('/api/vault/cluster-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: graphData.nodes }),
      });
      if (!res.ok) throw new Error('Cluster request failed');
      const data = await res.json();
      setClusters(data.clusters);
    } catch (err) {
      console.error('Clustering failed:', err);
      setClusters(null);
    } finally {
      setClusterLoading(false);
    }
  }, [graphData]);

  const getNodeColor = useCallback((node: VaultGraphNode) => {
    if (clusterMode && clusters) {
      const cluster = clusters.find(c => c.nodeIds.includes(node.id));
      if (cluster) return cluster.color;
    }
    if (node.path === activeNotePath) return '#f59e0b';
    return '#6366f1';
  }, [clusterMode, clusters, activeNotePath]);

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
      color: getNodeColor(n),
    })),
    links: graphData.links.map((l) => ({
      source: l.source,
      target: l.target,
      color: '#374151',
    })),
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0d0d0d]">
      {/* Cluster controls - top right */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
        {clusterMode && (
          <button
            onClick={fetchClusters}
            disabled={clusterLoading}
            className="px-2 py-1 text-[10px] rounded bg-[#2a2a4e] text-[#9ca3af] hover:text-[#e2e8f0] transition-colors disabled:opacity-50"
          >
            {clusterLoading ? '...' : 'Re-compute'}
          </button>
        )}
        <button
          onClick={() => {
            const newMode = !clusterMode;
            setClusterMode(newMode);
            if (newMode && !clusters) fetchClusters();
          }}
          className={`px-2 py-1 text-[10px] rounded transition-colors ${
            clusterMode
              ? 'bg-indigo-600 text-white'
              : 'bg-[#2a2a4e] text-[#9ca3af] hover:text-[#e2e8f0]'
          }`}
        >
          {clusterLoading ? 'Clustering...' : 'Cluster'}
        </button>
      </div>

      {/* Loading overlay */}
      {clusterLoading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 rounded-lg">
          <span className="text-sm text-white/70">Analyzing topics...</span>
        </div>
      )}

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

      {/* Cluster legend - bottom left */}
      {clusterMode && clusters && clusters.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 bg-[#12121f]/90 border border-[#2a2a4e] rounded-lg p-2 max-w-[160px]">
          <p className="text-[9px] text-[#6b7280] uppercase tracking-wide mb-1.5">Clusters</p>
          {clusters.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-[10px] text-[#9ca3af] truncate">{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
