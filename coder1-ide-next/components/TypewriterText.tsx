'use client';

import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  texts: string[];
  speed?: number;
  delay?: number;
  stopAfterCycles?: number;
  className?: string;
}

export default function TypewriterText({
  texts,
  speed = 100,
  delay = 2000,
  stopAfterCycles,
  className = ''
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;

    const timeout = setTimeout(() => {
      const currentText = texts[currentTextIndex];

      if (!isDeleting) {
        if (currentCharIndex < currentText.length) {
          setDisplayText(currentText.substring(0, currentCharIndex + 1));
          setCurrentCharIndex(currentCharIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), delay);
        }
      } else {
        if (currentCharIndex > 0) {
          setDisplayText(currentText.substring(0, currentCharIndex - 1));
          setCurrentCharIndex(currentCharIndex - 1);
        } else {
          setIsDeleting(false);
          const nextIndex = (currentTextIndex + 1) % texts.length;
          
          if (nextIndex === 0) {
            setCycleCount(prev => prev + 1);
            if (stopAfterCycles && cycleCount + 1 >= stopAfterCycles) {
              setIsComplete(true);
              setCurrentTextIndex(texts.length - 1);
              setDisplayText(texts[texts.length - 1]);
              setCurrentCharIndex(texts[texts.length - 1].length);
              return;
            }
          }
          
          setCurrentTextIndex(nextIndex);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [currentCharIndex, currentTextIndex, isDeleting, texts, speed, delay, cycleCount, stopAfterCycles, isComplete]);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
}