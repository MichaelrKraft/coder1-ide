export default function TestCSS() {
  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold text-coder1-cyan">CSS Test Page</h1>
        <div className="bg-bg-secondary p-4 rounded-lg border border-coder1-cyan">
          <p className="text-text-primary">Primary text on secondary background</p>
          <p className="text-text-secondary">Secondary text color</p>
          <p className="text-text-muted">Muted text color</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-coder1-cyan text-black p-4 rounded">Cyan</div>
          <div className="bg-coder1-purple text-white p-4 rounded">Purple</div>
          <div className="bg-orange-500 text-white p-4 rounded">Orange</div>
        </div>
        <div className="bg-gradient-to-r from-coder1-cyan to-coder1-purple p-8 rounded-lg">
          <p className="text-white font-bold text-2xl">Gradient Test</p>
        </div>
      </div>
    </div>
  );
}