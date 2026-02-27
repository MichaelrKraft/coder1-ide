'use client';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string;
  status: 'new' | 'reviewed' | 'resolved';
  createdAt: string;
}

interface AdminFeedbackItemProps {
  item: FeedbackItem;
  onStatusChange: (id: string, status: FeedbackItem['status']) => void;
  onDelete: (id: string) => void;
}

const TYPE_STYLES: Record<string, string> = {
  bug: 'bg-red-500/10 text-red-400 border-red-500/20',
  feature: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  general: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-yellow-500/10 text-yellow-400',
  reviewed: 'bg-blue-500/10 text-blue-400',
  resolved: 'bg-green-500/10 text-green-400',
};

export default function AdminFeedbackItem({ item, onStatusChange, onDelete }: AdminFeedbackItemProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-block px-2 py-0.5 text-xs rounded border ${TYPE_STYLES[item.type] || TYPE_STYLES.general}`}>
              {item.type}
            </span>
            <span className={`inline-block px-2 py-0.5 text-xs rounded ${STATUS_STYLES[item.status] || STATUS_STYLES.new}`}>
              {item.status}
            </span>
            {item.email && (
              <span className="text-xs text-gray-500">{item.email}</span>
            )}
            <span className="text-xs text-gray-600 ml-auto">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{item.message}</p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <select
            value={item.status}
            onChange={e => onStatusChange(item.id, e.target.value as FeedbackItem['status'])}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
          >
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-gray-600 hover:text-red-400 transition-colors"
            title="Delete feedback"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
