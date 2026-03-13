import { AxiosResponse } from 'axios';
import { apiClient } from './api';
import api from './api';
import { 
  ApiResponse, 
  PaginatedResponse,
  Document, 
  DocumentCategory 
} from '../types';

export interface DocumentFilters {
  category?: DocumentCategory;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
}

class DocumentService {
  /**
   * Get all documents with pagination and filters
   */
  async getDocuments(
    page: number = 1,
    limit: number = 20,
    filters?: DocumentFilters
  ): Promise<ApiResponse<PaginatedResponse<Document>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filters to params
    if (filters?.category) params.append('category', filters.category);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Document>>> = await apiClient.get(
      `/documents?${params}`
    );
    return response.data;
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<ApiResponse<Document>> {
    const response: AxiosResponse<ApiResponse<Document>> = await apiClient.get(
      `/documents/${id}`
    );
    return response.data;
  }

  /**
   * Get document by ID (alias for getDocument)
   */
  async getDocumentById(id: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(
      `/documents/${id}`
    );
    return response.data;
  }

  /**
   * Update document status
   */
  async updateStatus(id: string, status: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await apiClient.patch(
      `/documents/${id}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Analyze document with AI
   */
  async analyzeDocument(id: string, transactions: any[]): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await apiClient.post(
      `/documents/${id}/analyze`,
      { transactions }
    );
    return response.data;
  }

  /**
   * Import transactions from document
   */
  async importTransactions(id: string, data: {
    transactions: any[];
    accountId?: string;
    createAccount?: boolean;
    accountData?: any;
  }): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await apiClient.post(
      `/documents/${id}/import`,
      data
    );
    return response.data;
  }

  /**
   * Upload a new document
   */
  async uploadDocument(
    file: File,
    category: DocumentCategory,
    tags?: string[],
    autoProcess: boolean = true
  ): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', category);
    formData.append('autoProcess', String(autoProcess));
    
    if (tags) {
      tags.forEach(tag => formData.append('tags', tag));
    }

    const response: AxiosResponse<ApiResponse<Document>> = await apiClient.post(
      '/documents/upload/single',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          // You can use this to show upload progress
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          console.log(`Upload Progress: ${progress}%`);
        },
      }
    );
    return response.data;
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: string,
    data: {
      category?: DocumentCategory;
      tags?: string[];
    }
  ): Promise<ApiResponse<Document>> {
    const response: AxiosResponse<ApiResponse<Document>> = await apiClient.patch(
      `/documents/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/documents/upload/${id}`
    );
    return response.data;
  }

  /**
   * Download a document
   */
  async downloadDocument(id: string): Promise<Blob> {
    const response: AxiosResponse<Blob> = await apiClient.get(
      `/documents/${id}/download`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Get document preview URL
   */
  getDocumentPreviewUrl(id: string): string {
    return `${api.defaults.baseURL}/documents/${id}/preview`;
  }

  /**
   * Get document thumbnail URL
   */
  getDocumentThumbnailUrl(id: string): string {
    return `${api.defaults.baseURL}/documents/${id}/thumbnail`;
  }

  /**
   * Search documents by text content (OCR)
   */
  async searchDocumentContent(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Document & { highlights: string[] }>>> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response: AxiosResponse<ApiResponse<PaginatedResponse<Document & { highlights: string[] }>>> = await apiClient.get(
      `/documents/search?${params}`
    );
    return response.data;
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<ApiResponse<{
    totalDocuments: number;
    totalSize: number;
    documentsByCategory: Record<DocumentCategory, number>;
    recentUploads: Document[];
  }>> {
    const response: AxiosResponse<ApiResponse<{
      totalDocuments: number;
      totalSize: number;
      documentsByCategory: Record<DocumentCategory, number>;
      recentUploads: Document[];
    }>> = await apiClient.get('/documents/stats');
    return response.data;
  }

  /**
   * Get all available tags
   */
  async getTags(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/documents/tags');
    return response.data;
  }

  /**
   * Bulk delete documents
   */
  async bulkDeleteDocuments(documentIds: string[]): Promise<ApiResponse<{
    deleted: number;
    errors: Array<{ id: string; error: string }>;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      deleted: number;
      errors: Array<{ id: string; error: string }>;
    }>> = await apiClient.post('/documents/bulk-delete', {
      documentIds,
    });
    return response.data;
  }

  /**
   * Bulk update document tags
   */
  async bulkUpdateTags(
    documentIds: string[],
    tags: string[]
  ): Promise<ApiResponse<{
    updated: number;
    errors: Array<{ id: string; error: string }>;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      updated: number;
      errors: Array<{ id: string; error: string }>;
    }>> = await apiClient.post('/documents/bulk-update-tags', {
      documentIds,
      tags,
    });
    return response.data;
  }

  /**
   * Extract text from document (OCR)
   */
  async extractText(id: string): Promise<ApiResponse<{
    text: string;
    confidence: number;
    language: string;
  }>> {
    const response: AxiosResponse<ApiResponse<{
      text: string;
      confidence: number;
      language: string;
    }>> = await apiClient.post(`/documents/${id}/extract-text`);
    return response.data;
  }

  /**
   * Get document sharing link
   */
  async createSharingLink(
    id: string,
    expiresIn?: number // expiration in hours
  ): Promise<ApiResponse<{
    shareUrl: string;
    expiresAt: string;
  }>> {
    const data = expiresIn ? { expiresIn } : {};
    
    const response: AxiosResponse<ApiResponse<{
      shareUrl: string;
      expiresAt: string;
    }>> = await apiClient.post(`/documents/${id}/share`, data);
    return response.data;
  }

  /**
   * Revoke document sharing link
   */
  async revokeSharingLink(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await apiClient.delete(
      `/documents/${id}/share`
    );
    return response.data;
  }
}

export const documentService = new DocumentService();