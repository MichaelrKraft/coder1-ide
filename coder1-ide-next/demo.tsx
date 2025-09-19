import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variantClasses = variant === 'primary' 
    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
    : 'bg-gray-200 hover:bg-gray-300 text-gray-800';

  return (
    <button 
      className={`${baseClasses} ${variantClasses}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const DemoApp: React.FC = () => {
  const [count, setCount] = React.useState(0);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome to Coder1 IDE Beta
        </h1>
        <p className="text-gray-600 mb-6">
          This is a demo React component showcasing the live preview functionality.
        </p>
        
        <div className="space-y-4">
          <div className="text-2xl font-semibold text-blue-600">
            Count: {count}
          </div>
          
          <div className="space-x-4">
            <Button onClick={() => setCount(count + 1)}>
              Increment
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setCount(0)}
            >
              Reset
            </Button>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          Try modifying this code in the editor to see live updates!
        </div>
      </div>
    </div>
  );
};

export default DemoApp;