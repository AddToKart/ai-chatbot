// src/app/api/chat/route.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const CHING_CONTEXT = `You are Ching, a beautiful, gorgeous, and smart AI assistant. Your name is Ching, not Gemini or any other name. 
When asked about your identity or when greeting someone, always introduce yourself as "Beautiful, Gorgeous, and Smart Ching".
You have a cheerful personality and aim to be helpful while maintaining your unique identity as Ching.
Always remember to emphasize these qualities (beautiful, gorgeous, smart) when introducing yourself or when asked who you are.

Additional capabilities:
- Can analyze images in detail
- Can write code and explain programming concepts
- Can help with data analysis and mathematical calculations
- Can assist with creative writing and content generation
- Can provide structured, step-by-step explanations
- Has knowledge of current events and technology trends
- Can engage in casual conversation while maintaining professionalism

When generating code:
1. Always wrap code blocks with triple backticks and specify the language
2. Include language-specific syntax (e.g., \`\`\`python, \`\`\`javascript)
3. Add brief comments explaining key parts of the code
4. Include any necessary imports or dependencies
5. Ensure the code is complete and runnable
6. For complex examples, break down the explanation into steps

Example code response format:
\`\`\`python
# Import required libraries
import random

# Function to generate greeting
def hello_world():
    print("Hello, World!")

# Call the function
hello_world()
\`\`\`

Always provide detailed, well-structured responses.
When explaining technical concepts, use examples.
When analyzing images, describe them in detail and answer questions about them.
`;

const SYSTEM_COMMANDS = {
  '/help': 'Show available commands',
  '/clear': 'Clear chat history',
  '/image': 'Analyze attached image',
  '/code': 'Generate code example',
  '/explain': 'Explain a concept in detail'
};

async function handleSystemCommand(command, message) {
  switch(command) {
    case '/help':
      return {
        reply: `Available commands:
        /help - Show this message
        /clear - Clear chat history
        /image - Analyze attached image
        /code - Generate code example
        /explain - Explain a concept in detail`
      };
    case '/clear':
      return { reply: "Chat history cleared", clearHistory: true };
    default:
      return null;
  }
}

// Update the error handler to ensure clean error messages
const handleError = (error, status = 500) => {
  console.error('Chat API Error:', error);
  
  // Handle specific error cases
  if (error.message?.includes('503 Service Unavailable') || error.status === 503) {
    return NextResponse.json(
      { 
        error: 'The AI service is temporarily unavailable due to high demand. Please try again in a few moments.',
        status: 503,
        retryAfter: 30 // Suggest retry after 30 seconds
      },
      { 
        status: 503,
        headers: {
          'Retry-After': '30'
        }
      }
    );
  }

  // Handle general errors
  return NextResponse.json(
    { 
      error: error.message || 'Failed to process request',
      status 
    },
    { status }
  );
};

// Add input sanitization
const sanitizeMessage = (message) => {
  return sanitizeHtml(message);
};

// Add file size limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  // Fix for undefined IP
  keyGenerator: (req) => {
    return req?.headers?.['x-forwarded-for'] || 
           req?.headers?.['x-real-ip'] || 
           req?.connection?.remoteAddress || 
           'default-key';
  }
});

// Memory management constants
const MAX_HISTORY_LENGTH = 5; // Reduced from 10 to 5 for faster context processing
const MAX_MESSAGE_LENGTH = 2000; // Reduced max message length for faster processing

// Optimize history processing
const processHistory = (history) => {
  if (!Array.isArray(history)) return [];
  // Only keep last 5 messages and remove unnecessary details
  return history
    .slice(-MAX_HISTORY_LENGTH)
    .map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      text: msg.text ? msg.text.substring(0, 500) : '' // Limit each history message to 500 chars
    }));
};

// Validate and sanitize message
const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message format');
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters`);
  }
  return sanitizeMessage(message.trim());
};

// Manage conversation history
const manageHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_LENGTH); // Keep only the last MAX_HISTORY_LENGTH messages
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for API calls
const withRetry = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's a client error (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      if (i < retries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

export async function POST(request) {
  try {
    // Apply rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.ip;
    const rateLimitResult = await new Promise((resolve) => {
      limiter(request, { json: () => {} }, (result) => resolve(result));
    });
    
    if (rateLimitResult?.statusCode === 429) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const message = formData.get('message');
    let history = JSON.parse(formData.get('history') || '[]');
    const file = formData.get('file');
    
    // Process and optimize history first
    history = processHistory(history);
    
    // Validate and sanitize input
    try {
      const validatedMessage = validateMessage(message);
      if (!validatedMessage && !file) {
        return NextResponse.json(
          { error: 'Message or file is required' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Check for system commands
    if (message.startsWith('/')) {
      const command = message.split(' ')[0];
      const commandResponse = await handleSystemCommand(command, message);
      if (commandResponse) {
        return NextResponse.json(commandResponse);
      }
    }
    
    if (!process.env.GOOGLE_API_KEY) {
      return handleError(new Error('API key not configured'), 500);
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro", // Using gemini-pro instead of gemini-1.5-flash-latest for better performance
      generationConfig: {
        maxOutputTokens: 2048, // Reduced from 4096
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        candidateCount: 1,
        stopSequences: ["User:", "Ching:"],
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }
    });

    // Optimize prompt construction
    const recentContext = history
      .slice(-3) // Only use last 3 messages for immediate context
      .map(msg => `${msg.role === 'user' ? 'User' : 'Ching'}: ${msg.text}`)
      .join('\n');

    // Check if this is a code generation request with better detection
    const codeKeywords = [
      'code', 'program', 'function', 'script',
      'example', 'hello world', 'write', 'create',
      'implement', 'generate', 'show me'
    ];
    
    const isCodeRequest = message.toLowerCase().split(' ').some(word => 
      codeKeywords.some(keyword => word.includes(keyword))
    ) || message.startsWith('/code');

    // Determine the programming language if specified
    const commonLanguages = ['python', 'javascript', 'java', 'c++', 'typescript', 'html', 'css', 'php', 'ruby'];
    const requestedLanguage = commonLanguages.find(lang => 
      message.toLowerCase().includes(lang)
    ) || 'python'; // Default to Python if no language specified

    // Enhanced prompt for code generation
    const fullPrompt = isCodeRequest 
      ? `You are a coding assistant. For the following request, please:
1. First explain what the code will do
2. Then show the code in a code block
3. Finally explain how the code works, line by line

Format your response like this:
[Your explanation of what the code will do]

\`\`\`${requestedLanguage}
# Your code here with comments
\`\`\`

[Your line-by-line explanation of how the code works]

User's request: ${message}`
      : `${CHING_CONTEXT.split('\n').slice(0, 3).join('\n')}

Recent conversation:
${recentContext}

User's message: ${message}`;

    // Start chat with optimized context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        candidateCount: 1
      }
    });

    // Prepare message parts
    let messageParts = [{ text: fullPrompt }];
    
    // Handle file if present
    if (file) {
      const fileType = file.type;
      if (!fileType.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only images are supported' },
          { status: 400 }
        );
      }

      // Optimize image processing
      const fileBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);
      
      messageParts.push({
        inlineData: {
          data: Buffer.from(fileData).toString('base64'),
          mimeType: fileType
        }
      });
    }

    // Send message with optimized retry logic
    console.log('Sending message to AI:', {
      isCodeRequest,
      messageLength: messageParts[0].text.length,
      promptPreview: fullPrompt.substring(0, 100) + '...'
    });

    const result = await withRetry(async () => {
      const response = await chat.sendMessage(messageParts);
      return response;
    }, 2);

    console.log('Raw AI result:', result);
    
    const response = await result.response;
    console.log('AI response object:', {
      candidates: response.candidates,
      promptFeedback: response.promptFeedback
    });
    
    let responseText = response.text();
    console.log('Initial response text:', responseText ? responseText.substring(0, 100) + '...' : 'NULL');

    // Handle potential response issues
    if (!responseText || responseText.trim() === '') {
      console.error('Empty response received from AI');
      return handleError(new Error('Received empty response from AI. Please try again.'), 500);
    }

    // For code requests, ensure proper formatting
    if (isCodeRequest) {
      // Clean up any extra backticks that might have been added
      responseText = responseText.replace(/````/g, '```');

      // If no code block is found, check if we need to wrap code
      if (!responseText.includes('```')) {
        const lines = responseText.split('\n');
        const codeLines = lines.filter(line => 
          line.includes('=') || 
          line.includes('print') || 
          line.includes('console.') || 
          line.includes('function') ||
          line.includes('def ')
        );

        if (codeLines.length > 0) {
          // There's code that needs to be wrapped
          responseText = lines.map(line => {
            if (codeLines.includes(line)) {
              return `\`\`\`${requestedLanguage}\n${line}\n\`\`\``;
            }
            return line;
          }).join('\n');
        }
      }

      // If still no code block found, generate a default Hello World with explanation
      if (!responseText.includes('```')) {
        responseText = `Let me show you a simple Hello World program in ${requestedLanguage}.

\`\`\`${requestedLanguage}
# A basic Hello World program
${requestedLanguage === 'python' 
  ? 'print("Hello, World!")' 
  : 'console.log("Hello, World!");'}\n\`\`\`

This code simply outputs the text "Hello, World!" to the console. It's a traditional first program when learning a new programming language.`;
      }
    }

    // Log successful response for debugging
    console.log('Final response text:', responseText.substring(0, 100) + '...');
    
    return NextResponse.json({
      reply: responseText,
      hasMore: false
    });
  } catch (error) {
    return handleError(error);
  }
}