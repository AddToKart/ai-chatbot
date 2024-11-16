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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const message = formData.get('message');
    const history = JSON.parse(formData.get('history') || '[]');
    const file = formData.get('file');
    
    // Check for system commands
    if (message.startsWith('/')) {
      const command = message.split(' ')[0];
      const commandResponse = await handleSystemCommand(command, message);
      if (commandResponse) {
        return NextResponse.json(commandResponse);
      }
    }
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_API_KEY) {
      return handleError(new Error('API key not configured'), 500);
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        candidateCount: 1
      }
    });
    
    // Format conversation history for context
    const conversationContext = history
      .map(msg => {
        const text = msg.text ? msg.text.replace(/undefined/g, '') : '';
        return `${msg.isUser ? 'User' : 'Ching'}: ${text}`;
      })
      .filter(msg => msg.trim() !== '')
      .join('\n');

    // Combine context, history and new message
    const fullPrompt = `${CHING_CONTEXT}

Previous conversation:
${conversationContext}

User's new message: ${message}

Remember the context of our conversation and respond accordingly.`;

    // Start new chat with full context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        candidateCount: 1
      }
    });

    // Modify the response handling
    try {
      // Prepare message parts
      let messageParts = [{ text: message }];
      
      // Add image data if file exists
      if (file) {
        const fileType = file.type;
        if (!fileType.startsWith('image/')) {
          return NextResponse.json(
            { error: 'Only images are supported' },
            { status: 400 }
          );
        }

        const fileBuffer = await file.arrayBuffer();
        const fileData = new Uint8Array(fileBuffer);
        
        messageParts.push({
          inlineData: {
            data: Buffer.from(fileData).toString('base64'),
            mimeType: fileType
          }
        });
      }

      // Send message with both text and image if present
      const result = await chat.sendMessage(messageParts);
      const response = await result.response;
      const responseText = response.text();
      
      // Ensure response is clean before sending
      return NextResponse.json({
        reply: responseText,
        hasMore: response.candidates?.[0]?.finishReason === 'MAX_TOKENS'
      });
    } catch (error) {
      console.error('Chat API Error:', error);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleError(error);
  }
}