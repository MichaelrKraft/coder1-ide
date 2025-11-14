import React from 'react';
import { Check, X } from 'lucide-react';

interface ComparisonCell {
  value: string | boolean;
  highlight?: boolean;
}

interface ComparisonRow {
  feature: string;
  cursor?: string | boolean;
  copilot?: string | boolean;
  trae?: string | boolean;
  coder1?: string | boolean;
}

interface ComparisonTableProps {
  data: ComparisonRow[];
}

export function ComparisonTable({ data }: ComparisonTableProps) {
  const renderCell = (value: string | boolean | undefined, highlight = false) => {
    if (value === undefined) return '-';
    
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-400 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-red-400 mx-auto" />
      );
    }
    
    return <span className={highlight ? 'font-semibold text-blue-400' : ''}>{value}</span>;
  };

  return (
    <div className="overflow-x-auto my-8">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left p-3 text-slate-300">Feature</th>
            <th className="text-center p-3 text-slate-300">Cursor</th>
            <th className="text-center p-3 text-slate-300">Copilot</th>
            <th className="text-center p-3 text-slate-300">Trae.ai</th>
            <th className="text-center p-3 text-slate-100 bg-blue-900/20 relative">
              Coder1
              <span className="absolute top-1 right-1 text-xs bg-blue-500 px-2 py-0.5 rounded">You</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
              <td className="p-3 font-medium text-slate-200">{row.feature}</td>
              <td className="text-center p-3 text-slate-400">{renderCell(row.cursor)}</td>
              <td className="text-center p-3 text-slate-400">{renderCell(row.copilot)}</td>
              <td className="text-center p-3 text-slate-400">{renderCell(row.trae)}</td>
              <td className="text-center p-3 bg-blue-900/10">{renderCell(row.coder1, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
