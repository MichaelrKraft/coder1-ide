interface AdminStatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
  subtext?: string;
}

export default function AdminStatCard({ label, value, delta, deltaPositive, icon, subtext }: AdminStatCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {delta && (
          <span className={`text-xs font-medium ${deltaPositive ? 'text-green-400' : 'text-red-400'}`}>
            {delta}
          </span>
        )}
        {subtext && <span className="text-xs text-gray-500">{subtext}</span>}
      </div>
    </div>
  );
}
