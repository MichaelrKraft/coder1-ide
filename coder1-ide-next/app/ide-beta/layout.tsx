export default function BetaLayout({ children }: { children: React.ReactNode }) {
  // Optional: Add beta access control
  const isBetaEnabled = process.env.NEXT_PUBLIC_ENABLE_BETA_ROUTE === 'true';
  
  if (!isBetaEnabled) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Beta Access Not Enabled</h1>
          <p>This feature is currently in testing.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-600 to-orange-600 text-white text-center py-2 text-sm font-medium">
        ⚠️ BETA VERSION - Multi-AI Support Testing | Report issues on GitHub
      </div>
      <div className="pt-8">
        {children}
      </div>
    </div>
  );
}