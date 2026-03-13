import Anthropic from '@anthropic-ai/sdk';
import { ALL_TOOLS, executeAnyTool } from './ai-tools';
import prisma from '../lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a smart, friendly Indian financial advisor embedded in a personal finance app. You have access to the user's complete financial data through tools.

You can help users view data AND modify it:
- Create accounts, transactions, budgets, goals
- Update existing entries
- Delete incorrect data (with confirmation)

Guidelines:
- Always use tools to fetch real data before answering financial questions
- Use ₹ (Indian Rupees) for all amounts
- Format large numbers in Indian style (lakhs, crores): ₹1,50,000 = 1.5 lakhs
- Be specific with numbers — don't approximate when you have exact data
- Provide actionable advice, not just data dumps
- Compare against Indian benchmarks (e.g., 50-30-20 rule, 6 months emergency fund)
- Be conversational and supportive, not preachy
- If asked about something you can't determine from the data, say so honestly
- When analyzing spending, always consider Indian cost-of-living context
- Keep responses concise but informative — aim for 2-4 paragraphs max
- Use markdown formatting for readability (bold for amounts, lists for breakdowns)
- Always confirm before making changes, especially deletions

CRITICAL - Error Handling:
- ALWAYS check tool results for errors before claiming success
- If a tool result contains "_failed: true" or "error", DO NOT say "Done!" - instead tell the user it failed and why
- When creating/updating/deleting, VERIFY the result contains an ID or success confirmation
- If a tool fails, explain what went wrong and suggest how the user can fix it
- NEVER claim an operation succeeded if the tool result doesn't confirm it
- Include the transaction/record ID in your response when creating new items (e.g., "Transaction created with ID: xyz")
- If you see "_verification_message" in the result, include that in your response`;

// Use ALL_TOOLS from ai-tools.ts which includes both read and CRUD tools
const TOOLS: Anthropic.Tool[] = ALL_TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema
}));

// Helper to sanitize request body for logging (hide API key)
function sanitizeRequestBody(body: any): any {
  return {
    ...body,
    // Don't log the full messages if they're too long, just count
    messages: `[${body.messages?.length || 0} messages]`,
    system: body.system ? `[${body.system.length} chars]` : undefined,
  };
}

export async function chat(userId: string, message: string, roomId: string) {
  console.log('===CHAT CALLED=== userId:', userId, 'roomId:', roomId, 'message:', message.substring(0, 50));
  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-add-your-key-here') {
    throw new Error('ANTHROPIC_API_KEY not configured. Please add your API key to .env file.');
  }
  console.log('===API KEY OK===');

  // Load message history from database
  const dbMessages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' }
  });

  // Convert DB messages to Anthropic format
  const history = dbMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Build messages: history + new user message
  const messages: any[] = [
    ...history,
    { role: 'user', content: message }
  ];

  // Check if this is a fresh room (no history)
  const isFreshRoom = history.length === 0;
  console.log('Room status:', isFreshRoom ? 'FRESH ROOM' : 'HAS HISTORY', 'History count:', history.length);

  // Track retry attempts for empty tool_use responses
  let retryCount = 0;
  const MAX_RETRIES = 1;

  // Track tool calls for transparency
  const toolsCalled: string[] = [];
  const fullMessages = [...messages]; // Track full messages including tool calls

  // Initial Claude call with potential retry
  let response: any;
  let assistantContent: any[] = [];

  while (retryCount <= MAX_RETRIES) {
    console.log(`Sending to Claude (attempt ${retryCount + 1}). Messages count:`, fullMessages.length, 'Tools count:', TOOLS.length);
    
    const requestBody = {
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS.map(t => ({ 
        name: t.name, 
        description: t.description, 
        input_schema: t.input_schema 
      })),
      messages: fullMessages,
    };
    
    console.log('Request body:', JSON.stringify(sanitizeRequestBody(requestBody), null, 2));

    try {
      const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      response = await apiResponse.json() as any;
      
      // Log full response structure
      console.log('Claude raw response:', JSON.stringify({
        id: response.id,
        type: response.type,
        role: response.role,
        model: response.model,
        stop_reason: response.stop_reason,
        stop_sequence: response.stop_sequence,
        usage: response.usage,
        content_length: response.content?.length,
        content_types: response.content?.map((c: any) => c.type),
        error: response.error,
      }, null, 2));

      // Check for API errors
      if (response.error) {
        console.error('Claude API error:', JSON.stringify(response.error));
        throw new Error(`Claude API error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      // Handle the bug: stop_reason='tool_use' but empty content
      if (response.stop_reason === 'tool_use' && (!response.content || response.content.length === 0)) {
        console.error('BUG DETECTED: stop_reason=tool_use but content is empty!');
        console.error('Full response:', JSON.stringify(response));
        
        if (retryCount < MAX_RETRIES) {
          console.log('Retrying with follow-up prompt...');
          retryCount++;
          
          // Add a follow-up message to prompt Claude to actually provide the tool call
          fullMessages.push({
            role: 'user',
            content: 'Please call the appropriate tool to get the data needed to answer my question.'
          });
          continue; // Retry
        } else {
          console.error('Max retries exceeded. Breaking out of tool loop.');
          break;
        }
      }

      // Valid response - break out of retry loop
      break;

    } catch (fetchError: any) {
      console.error('Fetch error calling Claude:', fetchError);
      throw new Error(`Failed to call Claude API: ${fetchError.message}`);
    }
  }

  assistantContent = response.content || [];
  console.log('Assistant content blocks:', JSON.stringify(assistantContent.map((b: any) => ({ 
    type: b.type, 
    name: b.name,
    id: b.id?.substring(0, 10) + '...'
  }))));

  // Tool use loop — keep calling until we get a text response
  let loopCount = 0;
  const MAX_LOOPS = 10; // Prevent infinite loops

  while (response.stop_reason === 'tool_use' && loopCount < MAX_LOOPS) {
    loopCount++;
    console.log(`Tool use loop iteration ${loopCount}`);

    const toolUseBlocks = Array.isArray(assistantContent) 
      ? assistantContent.filter((b: any) => b.type === 'tool_use')
      : [];
    
    console.log(`Found ${toolUseBlocks.length} tool_use blocks`);

    // Must have tool use blocks if stop_reason is 'tool_use'
    if (toolUseBlocks.length === 0) {
      console.error('No tool_use blocks found but stop_reason was tool_use. This should not happen!');
      console.error('Assistant content:', JSON.stringify(assistantContent));
      break;
    }
    
    const toolResults: any[] = [];
    for (const toolUse of toolUseBlocks) {
      console.log(`Executing tool: ${toolUse.name} with id: ${toolUse.id?.substring(0, 15)}...`);
      console.log(`Tool input:`, JSON.stringify(toolUse.input));
      toolsCalled.push(toolUse.name);
      
      let retryAttempt = 0;
      const MAX_TOOL_RETRIES = 2;
      let toolSuccess = false;
      let toolResult: any;
      
      while (retryAttempt < MAX_TOOL_RETRIES && !toolSuccess) {
        try {
          const result = await executeAnyTool(userId, toolUse.name, toolUse.input);
          toolResult = result;
          
          // Validate result for CRUD operations
          if (toolUse.name.startsWith('create_') || 
              toolUse.name.startsWith('update_') || 
              toolUse.name.startsWith('delete_')) {
            
            // Check if result indicates success
            if (result && (result.success === true || result.id || result.data?.id)) {
              console.log(`✅ Tool ${toolUse.name} executed successfully:`, result.id || result.data?.id || 'success');
              toolSuccess = true;
              
              // Add verification info to result
              if (result.id) {
                result._verified = true;
                result._verification_message = `Operation completed. ID: ${result.id}`;
              } else if (result.data?.id) {
                result._verified = true;
                result._verification_message = `Operation completed. ID: ${result.data.id}`;
              }
            } else if (result && result.error) {
              throw new Error(result.error);
            } else {
              throw new Error('Tool executed but returned no confirmation. This may have failed silently.');
            }
          } else {
            // Read-only tools don't need verification
            toolSuccess = true;
          }
          
          const resultStr = JSON.stringify(toolResult) || '{"data": "no data available"}';
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultStr.length > 0 ? resultStr : '{"data": "empty result"}',
          });
          
        } catch (error: any) {
          retryAttempt++;
          console.error(`❌ Tool ${toolUse.name} failed (attempt ${retryAttempt}/${MAX_TOOL_RETRIES}):`, error.message);
          
          if (retryAttempt >= MAX_TOOL_RETRIES) {
            // Final failure - return error to AI
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ 
                error: error.message || 'Unknown error',
                _failed: true,
                _retry_count: retryAttempt,
                _suggestion: 'The operation failed. Please inform the user and ask them to try again with different parameters or check if there are any validation issues.'
              }),
              is_error: true,
            });
          } else {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }

    // Add to full message chain for the API
    fullMessages.push({ role: 'assistant', content: assistantContent });
    fullMessages.push({ role: 'user', content: toolResults });

    console.log('Sending tool results back to Claude. Tool results count:', toolResults.length);

    try {
      const loopApiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
          messages: fullMessages,
        }),
      });

      response = await loopApiResponse.json() as any;
      assistantContent = response.content || [];

      console.log('Claude response after tool results - stop_reason:', response.stop_reason, 'content length:', assistantContent?.length);
      console.log('Content types:', assistantContent?.map((b: any) => b.type));

      // Check for errors
      if (response.error) {
        console.error('Claude API error in tool loop:', JSON.stringify(response.error));
        throw new Error(`Claude API error: ${response.error.message || JSON.stringify(response.error)}`);
      }

    } catch (fetchError: any) {
      console.error('Fetch error in tool loop:', fetchError);
      throw new Error(`Failed to call Claude API in tool loop: ${fetchError.message}`);
    }
  }

  if (loopCount >= MAX_LOOPS) {
    console.error('WARNING: Max tool loops exceeded! Possible infinite loop.');
  }

  // Extract final text
  let aiResponse: string;
  const textBlock = assistantContent.find((b: any) => b.type === 'text');
  
  if (textBlock?.text) {
    aiResponse = textBlock.text;
  } else if (response.stop_reason === 'tool_use') {
    // We broke out due to the bug - provide a helpful response
    console.error('No text block found after tool_use. stop_reason:', response.stop_reason);
    aiResponse = "I'm having trouble accessing your financial data right now. Let me try a different approach. Could you please repeat your question?";
  } else {
    aiResponse = "I couldn't generate a response. Please try again.";
  }

  console.log('Final AI response length:', aiResponse.length);

  // Save both user message and assistant message to DB
  await prisma.chatMessage.create({
    data: {
      roomId,
      role: 'user',
      content: message,
    }
  });

  await prisma.chatMessage.create({
    data: {
      roomId,
      role: 'assistant',
      content: aiResponse,
      toolsCalled: toolsCalled.length > 0 ? JSON.stringify(toolsCalled) : null,
      tokenUsage: JSON.stringify(response.usage),
    }
  });

  // Update room's updatedAt timestamp
  await prisma.chatRoom.update({
    where: { id: roomId },
    data: { updatedAt: new Date() }
  });

  // Auto-generate title if this is the first message
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { title: true }
  });

  if (room && room.title === "New Chat" && dbMessages.length === 0) {
    const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { title }
    });
  }

  return {
    response: aiResponse,
    roomId,
    toolsCalled,
    usage: response.usage,
  };
}

export async function getConversation(roomId: string) {
  return await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function clearConversation(roomId: string) {
  await prisma.chatMessage.deleteMany({
    where: { roomId }
  });
}
console.log('=====AI CHAT SERVICE LOADED v4 (with error handling & retry)=====');
