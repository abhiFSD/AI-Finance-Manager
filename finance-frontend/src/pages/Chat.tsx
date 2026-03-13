import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Chip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Drawer,
  AppBar,
  Toolbar,
  InputAdornment,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Snackbar,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Add,
  Send,
  Search,
  MoreVert,
  Delete,
  Edit,
  Archive,
  Unarchive,
  ArrowBack,
  ExpandMore,
  ExpandLess,
  Chat as ChatIcon,
  SmartToy,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { chatService, ChatRoom, ChatMessageData } from '../services/chat.service';
import { formatDistanceToNow, format } from 'date-fns';

const SUGGESTED_QUESTIONS = [
  "What's my financial health score?",
  "How much did I spend this month?",
  "Am I on track with my budgets?",
  "Add a new transaction for ₹500 groceries",
  "Create a budget of ₹10,000 for dining",
  "Update my savings account balance",
];

const Chat: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRoomId, setMenuRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<(() => void) | null>(null);

  // Confirmation state for CRUD operations
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    toolName: string;
    input: any;
    message: string;
    actionType: 'create' | 'update' | 'delete';
  } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Success/error snackbar for write operations
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Load messages when room selected
  useEffect(() => {
    if (selectedRoomId) {
      loadMessages(selectedRoomId);
    } else {
      setMessages([]);
    }
  }, [selectedRoomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on room select
  useEffect(() => {
    if (selectedRoomId && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedRoomId, isMobile]);

  // Show success after write operations
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const toolsCalled = lastMessage?.toolsCalled ? JSON.parse(lastMessage.toolsCalled) : [];
    if (lastMessage?.role === 'assistant' && toolsCalled.some((t: string) =>
      t.startsWith('create') || t.startsWith('update') || t.startsWith('delete')
    )) {
      setSnackbar({
        open: true,
        message: 'Data updated successfully!',
        severity: 'success'
      });
    }
  }, [messages]);

  const loadRooms = async () => {
    try {
      setRoomsLoading(true);
      const { rooms: fetchedRooms } = await chatService.listRooms();
      setRooms(fetchedRooms.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('Failed to load chat rooms');
      setErrorAction(() => loadRooms);
    } finally {
      setRoomsLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const { messages: fetchedMessages } = await chatService.getRoom(roomId);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      const { room } = await chatService.createRoom();
      setRooms([room, ...rooms]);
      setSelectedRoomId(room.id);
      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      setError('Failed to create room');
      setErrorAction(null);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading || !selectedRoomId) return;

    setInput('');
    
    // Optimistic UI update - add user message immediately
    const tempUserMessage: ChatMessageData = {
      id: `temp-${Date.now()}`,
      roomId: selectedRoomId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setLoading(true);

    try {
      const response = await chatService.sendMessage(selectedRoomId, textToSend);

      // Check if confirmation is required
      if (response.requiresConfirmation) {
        setPendingConfirmation({
          toolName: response.toolName || '',
          input: { ...response.input, confirmed: true },
          message: response.message || '',
          actionType: response.actionType || 'delete'
        });
        setShowConfirmation(true);

        // Remove temp message and add user message only (not AI response yet)
        setMessages((prev) => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id);
          return [
            ...filtered,
            {
              id: `user-${Date.now()}`,
              roomId: selectedRoomId,
              role: 'user',
              content: textToSend,
              createdAt: new Date().toISOString(),
            },
          ];
        });
        setLoading(false);
        return; // Don't add AI message yet
      }

      // Remove temp message and add real messages
      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [
          ...filtered,
          {
            id: `user-${Date.now()}`,
            roomId: selectedRoomId,
            role: 'user',
            content: textToSend,
            createdAt: new Date().toISOString(),
          },
          {
            id: `assistant-${Date.now()}`,
            roomId: selectedRoomId,
            role: 'assistant',
            content: response.response,
            toolsCalled: response.toolsCalled?.length ? JSON.stringify(response.toolsCalled) : undefined,
            createdAt: new Date().toISOString(),
          },
        ];
      });

      // Reload rooms to update last message
      loadRooms();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      setErrorAction(() => () => handleSendMessage(textToSend));
      
      // Remove temp message and add error
      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            roomId: selectedRoomId,
            role: 'assistant',
            content: `⚠️ ${error.response?.data?.message || 'Failed to send message. Please try again.'}`,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, roomId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuRoomId(roomId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuRoomId(null);
  };

  const handleRename = async () => {
    if (!menuRoomId) return;
    const room = rooms.find(r => r.id === menuRoomId);
    if (room) {
      setEditTitle(room.title);
      setEditingTitle(true);
    }
    handleMenuClose();
  };

  const handleSaveTitle = async () => {
    if (!selectedRoomId || !editTitle.trim()) return;
    
    try {
      await chatService.updateRoom(selectedRoomId, { title: editTitle.trim() });
      setRooms(rooms.map(r => 
        r.id === selectedRoomId ? { ...r, title: editTitle.trim() } : r
      ));
      setEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleArchive = async () => {
    if (!menuRoomId) return;
    
    try {
      const room = rooms.find(r => r.id === menuRoomId);
      if (room) {
        await chatService.updateRoom(menuRoomId, { isArchived: !room.isArchived });
        setRooms(rooms.map(r => 
          r.id === menuRoomId ? { ...r, isArchived: !room.isArchived } : r
        ));
      }
    } catch (error) {
      console.error('Failed to archive room:', error);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (menuRoomId) {
      setRoomToDelete(menuRoomId);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return;

    try {
      await chatService.deleteRoom(roomToDelete);
      setRooms(rooms.filter(r => r.id !== roomToDelete));
      if (selectedRoomId === roomToDelete) {
        setSelectedRoomId(null);
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
    } finally {
      setDeleteDialogOpen(false);
      setRoomToDelete(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation || !selectedRoomId) return;

    setShowConfirmation(false);
    setLoading(true);

    // Add user confirmation message
    const confirmMessage: ChatMessageData = {
      id: Date.now().toString(),
      roomId: selectedRoomId,
      role: 'user',
      content: 'Yes, confirm',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, confirmMessage]);

    try {
      // Send the confirmed action
      const response = await chatService.sendMessage(
        selectedRoomId,
        JSON.stringify({
          confirmedAction: pendingConfirmation.toolName,
          input: pendingConfirmation.input
        })
      );

      // Add AI response
      const aiMessage: ChatMessageData = {
        id: (Date.now() + 1).toString(),
        roomId: selectedRoomId,
        role: 'assistant',
        content: response.response,
        toolsCalled: response.toolsCalled?.length ? JSON.stringify(response.toolsCalled) : undefined,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Reload rooms to update last message
      loadRooms();
    } catch (err: any) {
      setError(err.message || 'Failed to complete action');
    } finally {
      setLoading(false);
      setPendingConfirmation(null);
    }
  };

  // Filter rooms
  const activeRooms = rooms.filter(r => !r.isArchived && 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const archivedRooms = rooms.filter(r => r.isArchived && 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Sidebar component
  const SidebarContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* New Chat Button */}
      <Button
        variant="contained"
        fullWidth
        startIcon={<Add />}
        onClick={handleNewChat}
        sx={{ mb: 2 }}
      >
        New Chat
      </Button>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Search chats..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Rooms List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {roomsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {/* Active Rooms */}
            <List disablePadding>
              {activeRooms.map((room) => (
                <ListItem key={room.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={selectedRoomId === room.id}
                    onClick={() => handleRoomSelect(room.id)}
                    sx={{
                      borderRadius: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap fontWeight={500}>
                          {room.title}
                        </Typography>
                      }
                      secondary={
                        <Box component="span">
                          <Typography component="span" variant="caption" noWrap sx={{ display: 'block' }}>
                            {room.lastMessage?.content?.slice(0, 60)}
                            {room.lastMessage?.content && room.lastMessage.content.length > 60 ? '...' : ''}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, room.id)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {/* Archived Section */}
            {archivedRooms.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <ListItemButton onClick={() => setShowArchived(!showArchived)} sx={{ borderRadius: 1 }}>
                  <ListItemText 
                    primary={
                      <Typography variant="body2" fontWeight={500}>
                        Archived ({archivedRooms.length})
                      </Typography>
                    }
                  />
                  {showArchived ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={showArchived}>
                  <List disablePadding>
                    {archivedRooms.map((room) => (
                      <ListItem key={room.id} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          selected={selectedRoomId === room.id}
                          onClick={() => handleRoomSelect(room.id)}
                          sx={{
                            borderRadius: 1,
                            opacity: 0.7,
                            '&.Mui-selected': {
                              backgroundColor: 'primary.light',
                              opacity: 1,
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body2" noWrap>
                                {room.title}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })}
                              </Typography>
                            }
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, room.id)}
                            sx={{ ml: 1 }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );

  // Message bubble component
  const MessageBubble: React.FC<{ message: ChatMessageData }> = ({ message }) => {
    const isUser = message.role === 'user';
    const toolsCalled = message.toolsCalled ? JSON.parse(message.toolsCalled) : [];

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
                : theme.palette.grey[100],
              color: isUser
                ? theme.palette.primary.contrastText
                : theme.palette.text.primary,
              borderRadius: 2,
              px: 2,
              py: 1.5,
            }}
          >
            {/* Tool calls indicator with visual indicators for write operations */}
            {toolsCalled.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {toolsCalled.map((tool: string, idx: number) => (
                  <Chip
                    key={idx}
                    size="small"
                    icon={tool.startsWith('create') ? <AddIcon /> :
                          tool.startsWith('update') ? <EditIcon /> :
                          tool.startsWith('delete') ? <DeleteIcon /> : <BuildIcon />}
                    label={tool.replace(/_/g, ' ')}
                    color={tool.startsWith('delete') ? 'error' :
                           tool.startsWith('create') ? 'success' :
                           tool.startsWith('update') ? 'warning' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
            
            {/* Message content */}
            {isUser ? (
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
                    backgroundColor: theme.palette.grey[200],
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
              {format(new Date(message.createdAt), 'h:mm a')}
            </Typography>
          </Box>
        </Box>
      </Fade>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              mt: 8,
            },
          }}
        >
          <SidebarContent />
        </Drawer>
      ) : (
        <Paper
          elevation={2}
          sx={{
            width: 280,
            height: '100%',
            borderRadius: 0,
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <SidebarContent />
        </Paper>
      )}

      {/* Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedRoomId ? (
          <>
            {/* Header */}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 0,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {isMobile && (
                <IconButton onClick={() => setSidebarOpen(true)} sx={{ mr: 1 }}>
                  <ArrowBack />
                </IconButton>
              )}
              
              {editingTitle ? (
                <TextField
                  size="small"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  sx={{ flexGrow: 1 }}
                />
              ) : (
                <>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {selectedRoom?.title}
                  </Typography>
                  <IconButton size="small" onClick={handleRename}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setRoomToDelete(selectedRoomId);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </>
              )}
            </Paper>

            {/* Messages */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                py: 2,
                backgroundColor: 'background.default',
              }}
            >
              {messages.length === 0 && !loading ? (
                <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Start a new conversation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Try asking one of these questions:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 600, mx: 'auto' }}>
                    {SUGGESTED_QUESTIONS.map((question, index) => (
                      <Chip
                        key={index}
                        label={question}
                        onClick={() => handleSendMessage(question)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </>
              )}
              
              {loading && (
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

            {/* Input Area */}
            <Paper
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 0,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  placeholder="Ask about your finances..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  multiline
                  maxRows={4}
                />
                <IconButton
                  color="primary"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
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
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Avatar sx={{ width: 80, height: 80, mb: 3, bgcolor: 'primary.light' }}>
              <SmartToy sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              {rooms.length === 0 ? "Start a conversation with your AI financial advisor" : "Welcome to AI Advisor"}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {rooms.length === 0 
                ? "Get personalized financial insights and advice" 
                : "Select a conversation or start a new one to begin"}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleNewChat}
              size="large"
            >
              New Chat
            </Button>
          </Box>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRename}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          {rooms.find(r => r.id === menuRoomId)?.isArchived ? (
            <>
              <Unarchive fontSize="small" sx={{ mr: 1 }} />
              Unarchive
            </>
          ) : (
            <>
              <Archive fontSize="small" sx={{ mr: 1 }} />
              Archive
            </>
          )}
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Chat Room?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete this conversation and all its messages.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for CRUD operations */}
      <Dialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: pendingConfirmation?.actionType === 'delete' ? 'error.main' : 'primary.main'
        }}>
          {pendingConfirmation?.actionType === 'delete' ? (
            <>
              <DeleteIcon color="error" />
              Confirm Deletion
            </>
          ) : (
            <>
              <EditIcon color="primary" />
              Confirm {pendingConfirmation?.actionType === 'create' ? 'Creation' : 'Update'}
            </>
          )}
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {pendingConfirmation?.message}
          </Typography>

          {pendingConfirmation?.actionType === 'delete' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action cannot be undone. The data will be permanently deleted.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setShowConfirmation(false);
              setPendingConfirmation(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={pendingConfirmation?.actionType === 'delete' ? 'error' : 'primary'}
            variant="contained"
            startIcon={pendingConfirmation?.actionType === 'delete' ? <DeleteIcon /> : <CheckIcon />}
          >
            {pendingConfirmation?.actionType === 'delete' ? 'Delete' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar for write operations */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => {
          setError(null);
          setErrorAction(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          action={
            errorAction ? (
              <Button color="inherit" size="small" onClick={() => {
                errorAction();
                setError(null);
                setErrorAction(null);
              }}>
                Retry
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Chat;
