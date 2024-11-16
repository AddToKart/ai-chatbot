// src/components/ChatMessage.jsx
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-php-extras';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import { useEffect, useRef, useMemo } from 'react';
import ContinueButton from './ContinueButton';
import TypewriterText from './TypewriterText';

const LANGUAGE_MAP = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  php: 'php',
  sql: 'sql',
  bash: 'bash',
  sh: 'bash',
  css: 'css',
  json: 'json',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  plaintext: 'plaintext',
  text: 'plaintext'
};

// Manually register PHP
Prism.languages.php = Prism.languages.extend('clike', {
  keyword: /\b(?:and|or|xor|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|else|elseif|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|for|foreach|function|include|include_once|global|if|new|return|static|switch|use|require|require_once|var|while|abstract|interface|public|implements|private|protected|parent|throw|null|echo|print|trait|namespace|final|yield|goto|instanceof|finally|try|catch)\b/i,
  constant: /\b[A-Z0-9_]{2,}\b/,
  comment: {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
    lookbehind: true
  }
});

export default function ChatMessage({ message, isUser, isDark, imageData, handleContinue }) {
  const preRef = useRef(null);
  const messageId = useRef(Date.now()); // Unique ID for each message instance

  // Ensure message text is properly handled
  const messageText = typeof message === 'string' ? message : message?.text ?? '';

  // Memoize the content to prevent unnecessary re-renders
  const content = useMemo(() => {
    const parts = messageText.split(/(```[\s\S]*?```)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        return (
          <pre key={`${messageId.current}-${index}`} ref={preRef} className="relative">
            <code className="language-javascript">{code}</code>
          </pre>
        );
      }
      
      // Only use TypewriterText for AI responses
      if (isUser) {
        return <span key={`${messageId.current}-${index}`}>{part}</span>;
      }
      
      return (
        <TypewriterText 
          key={`${messageId.current}-${index}`}
          text={part} 
          onComplete={handleContinue && index === parts.length - 1 ? handleContinue : undefined}
        />
      );
    });
  }, [messageText, isUser, handleContinue]); // Only re-render when these values change

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-4 w-full`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-2">
          C
        </div>
      )}
      <div className={`max-w-3xl rounded-lg p-4 ${
        isUser ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-800'
      }`}>
        {imageData ? (
          <img src={imageData} alt="Uploaded content" className="max-w-full rounded mb-2" />
        ) : null}
        {content}
      </div>
    </div>
  );
}