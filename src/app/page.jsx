'use client';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import ChatMessage from '@/components/ChatMessage';

export default function Home() {
  const { isDark, setIsDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Tell me about yourself",
    "Can you write code?",
    "Analyze this image",
    "Help me with...",
  ]);
  const listRef = useRef(null);
  const [continuationContext, setContinuationContext] = useState(null);
  const MAX_CODE_LENGTH = 2000;
  const MAX_MESSAGE_LENGTH = 10000;
  const [responseTime, setResponseTime] = useState(0);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
  };
}

const handleCodeGeneration = (code) => {
  // Check for incomplete code blocks
  const codeBlockCount = (code.match(/```/g) || []).length;
  const isIncompleteCodeBlock = codeBlockCount % 2 !== 0;
  
  if (code.length > MAX_CODE_LENGTH || isIncompleteCodeBlock) {
    let splitIndex = MAX_CODE_LENGTH;
    
    // If we're splitting in the middle of a code block, find the last complete line
    if (code.length > MAX_CODE_LENGTH) {
      const lastNewline = code.lastIndexOf('\n', MAX_CODE_LENGTH);
      if (lastNewline !== -1) {
        splitIndex = lastNewline;
      }
    }
    
    const firstPart = code.substring(0, splitIndex);
    const remainingPart = code.substring(splitIndex);
    
    setContinuationContext({
      remainingCode: remainingPart,
      type: 'code'
    });
    
    return firstPart;
  }
  return code;
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    const messageText = input.trim();
    if (!messageText) return;

    // Add user message
    const userMessage = {
      text: messageText,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use FormData instead of JSON
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('history', JSON.stringify(messages));

      const response = await fetch('/api/chat', {
        method: 'POST',
        // Remove the Content-Type header to let the browser set it
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to process request');

      // Add AI message
      const aiMessage = {
        text: data.reply,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, something went wrong. Please try again.',
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
    }
    
    setLoading(false);
  };

  const handleContinue = async () => {
    if (!continuationContext) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('message', '/continue');
      formData.append('history', JSON.stringify(messages));
      formData.append('continuationContext', JSON.stringify(continuationContext));
      formData.append('maxLength', MAX_MESSAGE_LENGTH.toString());

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      if (continuationContext.type === 'continuation') {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          lastMessage.text += '\n' + data.reply;
          return newMessages;
        });
      } else {
        setMessages(prev => [...prev, { text: data.reply, isUser: false }]);
      }
      
      setContinuationContext(data.continuationContext || null);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, failed to continue generation.', 
        isUser: false 
      }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToItem(messages.length - 1);
    }
  }, [messages]);

  const handleSuggestionClick = (suggestion) => {
    if (!suggestion) return;
    setInput(suggestion);
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
        <header className={`py-4 px-6 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm mb-4 flex justify-between items-center`}>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Ching</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your Beautiful, Gorgeous, and Smart AI Assistant</p>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
          >
            {isDark ? '🌙' : '☀️'}
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <div className="flex flex-col space-y-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message.text}
                isUser={message.isUser}
                isDark={isDark}
                imageData={message.imageData}
                handleContinue={handleContinue}
                showContinue={!message.isUser && continuationContext && index === messages.length - 1}
              />
            ))}
          </div>
          {loading && (
            <div className="flex items-center justify-center space-x-2 p-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
            </div>
          )}
          {isTyping && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow-sm`}>
          <div className="flex gap-3 mb-2">
            <div className="flex-1 relative">
              {selectedFile && (
                <div className={`absolute -top-12 left-0 right-0 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} p-2 rounded-lg flex items-center justify-between`}>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    📎 {selectedFile.name}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-600 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                  ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
                placeholder={selectedFile ? "Ask a question about the image..." : "Type your message..."}
              />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 border rounded-lg 
                ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              📎
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium transition-colors duration-200"
            >
              Send
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto py-2 px-1 -mx-1">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm
                  ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
                  hover:bg-blue-500 hover:text-white transition-colors`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>
      </div>
    </main>
  );
}

