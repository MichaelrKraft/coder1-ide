export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
        <p className="text-text-secondary mb-8">Page not found</p>
        <a href="/" className="text-coder1-cyan hover:underline">
          Return to homepage
        </a>
      </div>
    </div>
  );
}