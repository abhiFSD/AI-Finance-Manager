import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { chat } from '../services/ai-chat.service';
import prisma from '../lib/prisma';

const router = express.Router();
router.use(authenticateToken);

// Create a new chat room
router.post('/rooms', async (req, res) => {
  const userId = req.user!.id;

  try {
    const room = await prisma.chatRoom.create({
      data: {
        userId,
        title: 'New Chat',
      }
    });

    res.json({
      success: true,
      data: { room }
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// List user's rooms (sorted by updatedAt desc, include last message)
router.get('/rooms', async (req, res) => {
  const userId = req.user!.id;

  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const roomsWithInfo = await Promise.all(
      rooms.map(async (room) => {
        const messageCount = await prisma.chatMessage.count({
          where: { roomId: room.id }
        });
        
        return {
          id: room.id,
          userId: room.userId,
          title: room.title,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          isArchived: room.isArchived,
          lastMessage: room.messages[0] || null,
          messageCount,
        };
      })
    );

    res.json({
      success: true,
      data: { rooms: roomsWithInfo }
    });
  } catch (error: any) {
    console.error('List rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list chat rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get room with all messages
router.get('/rooms/:id', async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (room.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat room'
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: { room, messages }
    });
  } catch (error: any) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Update room (title, isArchived)
router.patch('/rooms/:id', async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { title, isArchived } = req.body;

  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (room.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this chat room'
      });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (isArchived !== undefined) updateData.isArchived = isArchived;

    const updatedRoom = await prisma.chatRoom.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: { room: updatedRoom }
    });
  } catch (error: any) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Delete room (cascade deletes messages)
router.delete('/rooms/:id', async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (room.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this chat room'
      });
    }

    await prisma.chatRoom.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Chat room deleted'
    });
  } catch (error: any) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Send a message to a room (calls chat service)
router.post('/rooms/:id/messages', async (req, res) => {
  const userId = req.user!.id;
  const { id: roomId } = req.params;
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Message is required' 
    });
  }
  
  if (message.length > 2000) {
    return res.status(400).json({ 
      success: false, 
      message: 'Message too long (max 2000 chars)' 
    });
  }

  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (room.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages to this chat room'
      });
    }

    const result = await chat(userId, message.trim(), roomId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
