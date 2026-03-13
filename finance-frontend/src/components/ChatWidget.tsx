import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  TextField,
  Chip,
  Slide,
  Fade,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  SmartToy,
  Send,
  Close,
  Refresh,
  OpenInFull,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/chat.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolsCalled?: string[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "How much did I spend this month?",
  "Am I on track with my budgets?",
  "What's my net worth?",
  "Analyze my spending patterns",
  "How can I reduce expenses?",
  "Should I pay off loans or invest?",
];

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: `Hi! 👋 I'm your AI financial advisor. I can analyze your spending, check your budgets, track investments, and give you personalized financial advice.

Try asking me something!`,
  timestamp: new Date(),
};

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMobile]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: textToSend, timestamp: new Date() },
    ]);
    setIsLoading(true);

    try {
      // Create a new room on first message if needed
      let currentRoomId = roomId;
      if (!currentRoomId) {
        const { room } = await chatService.createRoom();
        currentRoomId = room.id;
        setRoomId(room.id);
      }

      // Send message using the room-based API
      const response = await chatService.sendMessage(currentRoomId, textToSend);
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          toolsCalled: response.toolsCalled,
          timestamp: new Date(),
        },
      ]);
    } catch (error: any) {
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      // Handle specific error cases
      if (error.response?.status === 500 && error.response?.data?.message?.includes('ANTHROPIC_API_KEY')) {
        errorMessage = '⚠️ The AI service is not configured yet. Please contact your administrator to set up the ANTHROPIC_API_KEY.';
      } else if (error.response?.data?.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setRoomId(null);
    setInput('');
  };

  const handleSuggestionClick = (question: string) => {
    handleSend(question);
  };

  // Message bubble component
  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <Fade in timeout={300}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 2,
            px: 2,
          }}
        >
          <Box
            sx={{
              maxWidth: '75%',
              backgroundColor: isUser
                ? theme.palette.primary.main
                : isSystem
                ? theme.palette.warning.light
                : theme.palette.mode === 'dark'
                ? theme.palette.grey[800]
                : theme.palette.grey[100],
              color: isUser
                ? theme.palette.primary.contrastText
                : isSystem
                ? theme.palette.warning.contrastText
                : theme.palette.text.primary,
              borderRadius: 2,
              px: 2,
              py: 1.5,
            }}
          >
            {/* Tool calls indicator */}
            {message.toolsCalled && message.toolsCalled.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`🔧 ${message.toolsCalled.join(', ')}`}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    height: 'auto',
                    py: 0.5,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? theme.palette.grey[700]
                      : theme.palette.grey[200],
                  }}
                />
              </Box>
            )}
            
            {/* Message content */}
            {isUser || isSystem ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
            ) : (
              <Box
                sx={{
                  '& p': { margin: 0, marginBottom: 1 },
                  '& p:last-child': { marginBottom: 0 },
                  '& ul, & ol': { marginTop: 0.5, marginBottom: 0.5, paddingLeft: 2 },
                  '& li': { marginBottom: 0.25 },
                  '& strong': { fontWeight: 600 },
                  '& code': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? theme.palette.grey[900]
                      : theme.palette.grey[200],
                    padding: '2px 4px',
                    borderRadius: 1,
                    fontSize: '0.875em',
                  },
                }}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Box>
            )}
            
            {/* Timestamp */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                opacity: 0.7,
                fontSize: '0.65rem',
              }}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          </Box>
        </Box>
      </Fade>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1300,
        }}
      >
        {isOpen ? <Close /> : <SmartToy />}
      </Fab>

      {/* Chat Panel */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: isMobile ? 0 : 100,
            right: isMobile ? 0 : 24,
            width: isMobile ? '100%' : 400,
            height: isMobile ? '100%' : 600,
            zIndex: 1300,
            borderRadius: isMobile ? 0 : 4,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <AppBar position="static" elevation={0}>
            <Toolbar variant="dense">
              <SmartToy sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1rem' }}>
                Financial Advisor
              </Typography>
              <Tooltip title="Open full chat page">
                <IconButton
                  edge="end"
                  color="inherit"
                  onClick={() => navigate('/chat')}
                  size="small"
                  sx={{ mr: 0.5 }}
                >
                  <OpenInFull />
                </IconButton>
              </Tooltip>
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleNewChat}
                size="small"
                sx={{ mr: 0.5 }}
              >
                <Refresh />
              </IconButton>
              <IconButton
                edge="end"
                color="inherit"
                onClick={() => setIsOpen(false)}
                size="small"
              >
                <Close />
              </IconButton>
            </Toolbar>
          </AppBar>

          {/* Messages Area */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              py: 2,
              backgroundColor: theme.palette.mode === 'dark'
                ? theme.palette.grey[900]
                : theme.palette.grey[50],
            }}
          >
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    AI is thinking...
                  </Typography>
                </Box>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          {/* Suggested Questions */}
          {(messages.length === 1 || messages[messages.length - 1]?.role === 'assistant') && !isLoading && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderTop: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Suggested:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  overflowX: 'auto',
                  pb: 0.5,
                  '&::-webkit-scrollbar': {
                    height: 6,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.grey[400],
                    borderRadius: 3,
                  },
                }}
              >
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <Chip
                    key={index}
                    label={question}
                    onClick={() => handleSuggestionClick(question)}
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.light,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input Area */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder="Ask about your finances..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              multiline
              maxRows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                '&:disabled': {
                  backgroundColor: theme.palette.action.disabledBackground,
                },
              }}
            >
              <Send />
            </IconButton>
          </Box>
        </Paper>
      </Slide>
    </>
  );
};

export default ChatWidget;
