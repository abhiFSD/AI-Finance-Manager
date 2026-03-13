import apiClient from './api';

export interface ChatRoom {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  lastMessage?: ChatMessageData;
  messageCount?: number;
}

export interface ChatMessageData {
  id: string;
  roomId: string;
  role: 'user' | 'assistant';
  content: string;
  toolsCalled?: string;  // JSON string array
  tokenUsage?: string;   // JSON string
  createdAt: string;
}

export interface SendMessageResponse {
  response: string;
  roomId: string;
  toolsCalled: string[];
  usage?: any;
  requiresConfirmation?: boolean;
  toolName?: string;
  input?: any;
  message?: string;
  actionType?: 'create' | 'update' | 'delete';
}

class ChatService {
  async createRoom(): Promise<{ room: ChatRoom }> {
    const res = await apiClient.post('/chat/rooms');
    return res.data.data;
  }

  async listRooms(): Promise<{ rooms: ChatRoom[] }> {
    const res = await apiClient.get('/chat/rooms');
    return res.data.data;
  }

  async getRoom(roomId: string): Promise<{ room: ChatRoom; messages: ChatMessageData[] }> {
    const res = await apiClient.get(`/chat/rooms/${roomId}`);
    return res.data.data;
  }

  async updateRoom(roomId: string, data: { title?: string; isArchived?: boolean }): Promise<{ room: ChatRoom }> {
    const res = await apiClient.patch(`/chat/rooms/${roomId}`, data);
    return res.data.data;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await apiClient.delete(`/chat/rooms/${roomId}`);
  }

  async sendMessage(roomId: string, message: string): Promise<SendMessageResponse> {
    const res = await apiClient.post(`/chat/rooms/${roomId}/messages`, { message }, {
      timeout: 120000, // 2 min for AI tool calls
    });
    return res.data.data;
  }
}

export const chatService = new ChatService();
