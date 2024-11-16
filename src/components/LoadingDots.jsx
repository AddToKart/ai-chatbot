'use client';

function LoadingDots() {
  return (
    <div className="flex items-center space-x-1">
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
    </div>
  );
}

module.exports = LoadingDots;
