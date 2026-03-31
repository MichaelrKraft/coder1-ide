'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface CodebaseNode {
  id: string;
  name: string;
  path: string;
  val: number;
  color: string;
  functions: number;
  lines: number;
  ext: string;
}

interface CodebaseLink {
  source: string;
  target: string;
  color: string;
}

interface CodebaseGraphData {
  nodes: CodebaseNode[];
  links: CodebaseLink[];
}

const EXT_LABELS: Record<string, string> = {
  '.tsx': 'TSX',
  '.ts': 'TS',
  '.js': 'JS',
  '.jsx': 'JSX',
  '.css': 'CSS',
  '.json': 'JSON',
  '.md': 'MD',
};

const EXT_COLORS: Record<string, string> = {
  '.tsx': '#6366f1',
  '.ts': '#06b6d4',
  '.js': '#10b981',
  '.jsx': '#8b5cf6',
  '.css': '#f59e0b',
  '.json': '#6b7280',
  '.md': '#94a3b8',
};

export default function CodebaseGraph() {
  const [graphData, setGraphData] = useState<CodebaseGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [selectedNode, setSelectedNode] = useState<CodebaseNode | null>(null);
  const [hiddenExts, setHiddenExts] = useState<Set<string>>(new Set());

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/codebase/graph');
      if (!res.ok) {
        setError(`Failed to load graph: ${res.status}`);
        return;
      }
      const data: CodebaseGraphData = await res.json();
      setGraphData(data);
    } catch (err) {
      setError('Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIndex = useCallback(async () => {
    setIndexing(true);
    setError(null);
    try {
      const res = await fetch('/api/codebase/index', { method: 'POST' });
      if (!res.ok) {
        setError(`Indexing failed: ${res.status}`);
        return;
      }
      // Refetch graph after indexing
      await fetchGraph();
    } catch (err) {
      setError('Failed to index codebase');
    } finally {
      setIndexing(false);
    }
  }, [fetchGraph]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

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

  const toggleExt = useCallback((ext: string) => {
    setHiddenExts((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      return next;
    });
  }, []);

  const allExts = graphData
    ? Array.from(new Set(graphData.nodes.map((n) => n.ext))).filter((e) => e in EXT_LABELS)
    : [];

  const filteredNodes = graphData ? graphData.nodes.filter((n) => !hiddenExts.has(n.ext)) : [];
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = graphData
    ? graphData.links.filter(
        (l) => filteredNodeIds.has(l.source as string) && filteredNodeIds.has(l.target as string)
      )
    : [];

  if (loading || indexing) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full bg-[#0d0d0d] text-gray-500 gap-3"
      >
        <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        <div className="text-sm">{indexing ? 'Indexing codebase...' : 'Loading graph...'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full bg-[#0d0d0d] text-gray-500 gap-3"
      >
        <div className="text-red-400 text-sm">{error}</div>
        <button
          onClick={fetchGraph}
          className="px-4 py-2 text-xs bg-[#1a1a2e] text-[#8b5cf6] rounded hover:bg-[#252547] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full bg-[#0d0d0d] text-gray-500 gap-3"
      >
        <div className="text-3xl">🕸️</div>
        <div className="text-sm text-center px-4">
          <p className="text-[#e2e8f0] font-medium mb-1">CodeNexus</p>
          <p className="text-[#6b7280] text-xs">See how your files connect through imports</p>
        </div>
        <button
          onClick={handleIndex}
          className="mt-2 px-4 py-2 text-xs bg-[#8b5cf6] text-white rounded hover:bg-[#7c3aed] transition-colors"
        >
          Index Codebase
        </button>
      </div>
    );
  }

  const fgData = {
    nodes: filteredNodes.map((n) => ({
      id: n.id,
      name: n.name,
      path: n.path,
      val: n.val,
      color: n.color,
      functions: n.functions,
      lines: n.lines,
      ext: n.ext,
    })),
    links: filteredLinks.map((l) => ({
      source: l.source,
      target: l.target,
      color: l.color,
    })),
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0d0d0d]">
      {/* File type filters - top right */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10 flex-wrap justify-end max-w-[220px]">
        {allExts.map((ext) => (
          <button
            key={ext}
            onClick={() => toggleExt(ext)}
            className="px-2 py-0.5 text-[10px] rounded transition-colors"
            style={
              !hiddenExts.has(ext)
                ? { backgroundColor: EXT_COLORS[ext], color: '#fff' }
                : { backgroundColor: '#1a1a2e', color: '#4b5563' }
            }
          >
            {EXT_LABELS[ext]}
          </button>
        ))}
      </div>

      {/* Stats and refresh - top left */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <span className="text-[10px] text-[#4b5563]">
          {fgData.nodes.length} files · {fgData.links.length} links
        </span>
        <button
          onClick={fetchGraph}
          title="Refresh graph"
          className="p-1 text-[#4b5563] hover:text-[#8b5cf6] hover:bg-[#1a1a2e] rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

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
        onNodeClick={(node: any) => {
          setSelectedNode(node as CodebaseNode);
        }}
      />

      {/* Selected node info - bottom left */}
      {selectedNode && (
        <div className="absolute bottom-2 left-2 z-10 bg-[#12121f]/90 border border-[#2a2a4e] rounded-lg p-3 max-w-[260px]">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: EXT_COLORS[selectedNode.ext] ?? '#6b7280',
                color: '#fff',
              }}
            >
              {selectedNode.ext.toUpperCase().replace('.', '')}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[#4b5563] hover:text-[#9ca3af] text-xs ml-2"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-[#e2e8f0] font-medium truncate mb-1">
            {selectedNode.name}
          </p>
          <p className="text-[10px] text-[#6b7280] break-all mb-2">{selectedNode.path}</p>
          <div className="flex gap-3 text-[10px] text-[#9ca3af]">
            <span>{selectedNode.functions} fn</span>
            <span>{selectedNode.lines} lines</span>
            <span>{selectedNode.val - 1} imported by</span>
          </div>
        </div>
      )}
    </div>
  );
}
