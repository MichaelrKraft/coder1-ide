'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-8">
      <h1 className="text-4xl font-bold mb-4">Test Page</h1>
      <p className="text-lg mb-4">If you can see this, Next.js is working correctly!</p>
      <div className="bg-bg-secondary p-4 rounded-lg">
        <h2 className="text-2xl font-semibold mb-2">Status Check</h2>
        <ul className="space-y-2">
          <li>✅ Next.js Server: Running</li>
          <li>✅ Routing: Working</li>
          <li>✅ Tailwind CSS: Applied</li>
          <li>✅ Client-side rendering: Active</li>
        </ul>
      </div>
      <div className="mt-8">
        <a href="/ide" className="text-coder1-cyan hover:underline text-lg">
          Go to IDE →
        </a>
      </div>
    </div>
  );
}