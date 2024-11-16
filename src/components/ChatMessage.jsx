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
  const partIdCounter = useRef(0); // Counter for generating unique part IDs

  // Generate a unique key for a message part
  const getUniqueKey = () => {
    partIdCounter.current += 1;
    return `${messageId.current}-part-${partIdCounter.current}`;
  };

  // Ensure message text is properly handled
  const messageText = typeof message === 'string' ? message : message?.text ?? '';

  // Memoize the content to prevent unnecessary re-renders
  const content = useMemo(() => {
    // Reset part counter for each new content generation
    partIdCounter.current = 0;

    // First, find all code blocks and their positions
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const codeBlocks = [];
    const textParts = [];
    let lastIndex = 0;
    let match;

    // Handle the case where the entire message is a code block
    if (messageText.trim().startsWith('```') && messageText.trim().endsWith('```')) {
      const singleBlockMatch = messageText.match(/```(\w+)?\n?([\s\S]*?)```/);
      if (singleBlockMatch) {
        return [{
          type: 'code',
          language: singleBlockMatch[1] || 'plaintext',
          content: singleBlockMatch[2].trim(),
          key: getUniqueKey()
        }];
      }
    }

    while ((match = codeBlockRegex.exec(messageText)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = messageText.slice(lastIndex, match.index).trim();
        if (textContent) {
          textParts.push({
            type: 'text',
            content: textContent,
            key: getUniqueKey()
          });
        }
      }

      // Add code block
      codeBlocks.push({
        type: 'code',
        language: match[1] || 'plaintext',
        content: match[2].trim(),
        key: getUniqueKey()
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < messageText.length) {
      const textContent = messageText.slice(lastIndex).trim();
      if (textContent) {
        textParts.push({
          type: 'text',
          content: textContent,
          key: getUniqueKey()
        });
      }
    }

    // Merge code blocks and text parts in order
    const allParts = [];
    let codeBlockIndex = 0;
    
    textParts.forEach((textPart) => {
      allParts.push(textPart);
      if (codeBlockIndex < codeBlocks.length) {
        allParts.push(codeBlocks[codeBlockIndex++]);
      }
    });

    // Add any remaining code blocks
    while (codeBlockIndex < codeBlocks.length) {
      allParts.push(codeBlocks[codeBlockIndex++]);
    }

    return allParts;
  }, [messageText]);

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
        {content.map((part) => {
          if (part.type === 'code') {
            // Fix language detection
            const detectedLang = part.language?.toLowerCase() || '';
            const language = LANGUAGE_MAP[detectedLang] || detectedLang || 'plaintext';
            const displayLang = language.charAt(0).toUpperCase() + language.slice(1);
            
            return (
              <div key={part.key} className="my-4">
                {!isUser && (
                  <TypewriterText 
                    text={part.content}
                    isCode={true}
                    language={language}
                    onComplete={handleContinue}
                  />
                )}
                {isUser && (
                  <div className="rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e1e]">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-sm text-gray-400">{displayLang}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="grid grid-cols-[auto,1fr]">
                        <div 
                          className="bg-gray-800 text-gray-500 text-right py-4 select-none border-r border-gray-700 px-4"
                        >
                          {part.content.trim().split('\n').map((_, i) => (
                            <div key={i} className="leading-6 text-xs">{i + 1}</div>
                          ))}
                        </div>
                        <pre className="p-4 overflow-x-auto m-0">
                          <code className={`language-${language} text-sm leading-6 whitespace-pre`}>
                            {part.content.trim()}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          // Handle regular text
          if (!isUser) {
            return (
              <TypewriterText 
                key={part.key}
                text={part.content} 
                onComplete={handleContinue}
              />
            );
          }
          
          return <span key={part.key}>{part.content}</span>;
        })}
      </div>
    </div>
  );
}