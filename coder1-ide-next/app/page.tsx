'use client';

import { useRouter } from 'next/navigation';
import HeroSection from '@/components/HeroSection';

export default function HomePage() {
  const router = useRouter();

  const handleTourStart = () => {
    // Navigate to IDE with tour parameter
    router.push('/ide?tour=true');
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <HeroSection 
        onTourStart={handleTourStart}
        onDismiss={() => {
          // When dismissed, redirect to IDE
          router.push('/ide');
        }}
      />
    </div>
  );
}