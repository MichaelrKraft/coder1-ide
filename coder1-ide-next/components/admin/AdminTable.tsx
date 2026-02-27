interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: string;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function AdminTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  emptyMessage = 'No data found.',
  page,
  totalPages,
  onPageChange,
}: AdminTableProps<T>) {
  return (
    <div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-700/40">
              {columns.map(col => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row[keyField])} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-gray-300">
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange((page ?? 1) - 1)}
              disabled={(page ?? 1) <= 1}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-gray-300 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange((page ?? 1) + 1)}
              disabled={(page ?? 1) >= totalPages}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
