import React, { useState, useEffect, useMemo } from 'react';

interface TypewriterProps {
  text: string | string[];
  speed?: number;
  loop?: boolean;
  className?: string;
  cursor?: boolean;
  cursorChar?: string;
  delay?: number;
  stopAfterCycles?: number;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 100,
  loop = false,
  className = '',
  cursor = true,
  cursorChar = '|',
  delay = 1000,
  stopAfterCycles
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const texts = useMemo(() => Array.isArray(text) ? text : [text], [text]);

  useEffect(() => {
    if (isComplete) return;

    const currentFullText = texts[currentTextIndex];
    
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, delay);
      return () => clearTimeout(pauseTimer);
    }

    if (!isDeleting && currentIndex === currentFullText.length) {
      // Check if we should stop after this cycle
      if (stopAfterCycles && currentTextIndex === 0 && cycleCount >= stopAfterCycles - 1) {
        setIsComplete(true);
        return;
      }
      
      if (!loop && currentTextIndex === texts.length - 1) {
        return;
      }
      setIsPaused(true);
      return;
    }

    if (isDeleting && currentIndex === 0) {
      setIsDeleting(false);
      const nextIndex = (currentTextIndex + 1) % texts.length;
      
      // Increment cycle count when we loop back to the first text
      if (nextIndex === 0) {
        setCycleCount(prev => prev + 1);
      }
      
      setCurrentTextIndex(nextIndex);
      return;
    }

    const timer = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentFullText.substring(0, currentIndex - 1));
        setCurrentIndex(currentIndex - 1);
      } else {
        setDisplayText(currentFullText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timer);
  }, [currentIndex, currentTextIndex, isDeleting, isPaused, texts, speed, loop, delay, cycleCount, stopAfterCycles, isComplete]);

  return (
    <span className={className}>
      {displayText}
      {cursor && <span className="animate-pulse">{cursorChar}</span>}
    </span>
  );
};