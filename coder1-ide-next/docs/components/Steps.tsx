import React from 'react';

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  const steps = React.Children.toArray(children);
  
  return (
    <div className="my-8 space-y-6">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-700 mt-2" />
            )}
          </div>
          <div className="flex-1 pb-8">
            {step}
          </div>
        </div>
      ))}
    </div>
  );
}

interface StepProps {
  title?: string;
  children: React.ReactNode;
}

export function Step({ title, children }: StepProps) {
  return (
    <div>
      {title && <h3 className="text-xl font-semibold mb-2 mt-0">{title}</h3>}
      <div className="text-slate-300">{children}</div>
    </div>
  );
}
