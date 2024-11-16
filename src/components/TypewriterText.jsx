'use client';
import { useState, useEffect, useRef } from 'react';
import LoadingDots from './LoadingDots';
import Prism from 'prismjs';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers';

// Language metadata
const LANGUAGE_META = {
  javascript: { icon: '⚡', ext: '.js', canRun: true },
  typescript: { icon: '📘', ext: '.ts', canRun: true },
  python: { icon: '🐍', ext: '.py', canRun: true },
  java: { icon: '☕', ext: '.java', canRun: false },
  cpp: { icon: '⚙️', ext: '.cpp', canRun: false },
  csharp: { icon: '#️⃣', ext: '.cs', canRun: false },
  php: { icon: '🐘', ext: '.php', canRun: false },
  ruby: { icon: '💎', ext: '.rb', canRun: false },
  go: { icon: '🔵', ext: '.go', canRun: false },
  rust: { icon: '🦀', ext: '.rs', canRun: false },
  swift: { icon: '🎯', ext: '.swift', canRun: false },
  kotlin: { icon: '🎨', ext: '.kt', canRun: false },
  html: { icon: '🌐', ext: '.html', canRun: true },
  css: { icon: '🎨', ext: '.css', canRun: false },
  sql: { icon: '🗃️', ext: '.sql', canRun: false },
  markdown: { icon: '📝', ext: '.md', canRun: false },
};

function TypewriterText({ text, onComplete, isCode = false, language = 'javascript' }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  const codeRef = useRef(null);

  // Get language metadata
  const langMeta = LANGUAGE_META[language.toLowerCase()] || { icon: '📄', ext: '.txt', canRun: false };

  useEffect(() => {
    if (!text || hasAnimatedRef.current) return;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      
      // Slower typing for code blocks
      const charDelay = isCode ? 30 : 20;
      const charIndex = Math.floor(progress / charDelay);

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
  }, [text, onComplete, isCode]);

  useEffect(() => {
    if (isCode && codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [displayedText, isCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      // For now, we'll just show a placeholder for the run functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Code execution feature coming soon!');
    } finally {
      setIsRunning(false);
    }
  };

  if (isCode) {
    return (
      <div className="relative group">
        <div className="absolute right-2 top-2 flex gap-2">
          {!isComplete && <LoadingDots />}
          {isComplete && (
            <>
              {langMeta.canRun && (
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1 rounded-md bg-green-700 hover:bg-green-600 text-gray-200 text-sm flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <LoadingDots />
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm flex items-center gap-2"
              >
                {isCopied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </>
          )}
        </div>
        <div className="rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-sm text-gray-400 flex items-center gap-2">
                {langMeta.icon} {language}{langMeta.ext}
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-[auto,1fr]">
              <div 
                className="bg-gray-800 text-gray-500 text-right py-4 select-none border-r border-gray-700 px-4" 
              >
                {displayedText.trim().split('\n').map((_, i) => (
                  <div key={i} className="leading-6 text-xs">{i + 1}</div>
                ))}
              </div>
              <pre className="p-4 overflow-x-auto m-0">
                <code ref={codeRef} className={`language-${language} text-sm leading-6 whitespace-pre`}>
                  {displayedText.trim()}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="whitespace-pre-wrap">{displayedText}</span>
      {!isComplete && <LoadingDots />}
    </div>
  );
}

export default TypewriterText;
