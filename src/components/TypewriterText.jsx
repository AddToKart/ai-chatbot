'use client';
import { useState, useEffect, useRef } from 'react';
import LoadingDots from './LoadingDots';

function TypewriterText({ text, onComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!text || hasAnimatedRef.current) return;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const charIndex = Math.floor(progress / 20); // 20ms per character

      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayedText(text);
        setIsComplete(true);
        hasAnimatedRef.current = true;
        if (onComplete) onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, onComplete]);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="whitespace-pre-wrap">{displayedText}</span>
      {!isComplete && <LoadingDots />}
    </div>
  );
}

export default TypewriterText;
