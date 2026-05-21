import HiveMindList from '@/components/agent-hub/hive-mind/HiveMindList';

export default function HiveMindPage() {
  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="px-6 py-4 border-b border-gray-700 shrink-0">
        <h1 className="text-2xl font-bold text-white mb-1">Hive Mind</h1>
        <p className="text-gray-400 text-sm">Agent activity graph and knowledge network</p>
      </div>
      <div className="flex-1 min-h-0">
        <HiveMindList />
      </div>
    </div>
  );
}
