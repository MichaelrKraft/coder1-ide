'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { features } from '@/lib/feature-flags';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // If we're on a subpage (like /teams), link back to /alpha for anchor links
  const isOnAlphaPage = pathname === '/alpha';
  const anchorBase = isOnAlphaPage ? '' : '/alpha';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-sm border-b border-cyan-500/30' : 'bg-black border-b border-cyan-500/20'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/alpha" className="flex items-center">
          <Image
            src="/Coder1-Logo-Sharp.svg"
            alt="Coder1"
            width={180}
            height={60}
            className="h-14 w-auto"
          />
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {features().teamFeatures && <Link href="/teams" className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Teams</Link>}
          <Link href={`${anchorBase}#features`} className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Features</Link>
          <Link href={`${anchorBase}#pricing`} className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Pricing</Link>
          <Link href={`${anchorBase}#comparison`} className="text-white/80 hover:text-cyan-400 transition-colors font-medium">Compare</Link>
        </div>
        <Link
          href="/ide"
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold rounded-full hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
        >
          Try Coder1 Free
        </Link>
      </div>
    </nav>
  );
}
