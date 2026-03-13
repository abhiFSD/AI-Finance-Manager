import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Document {
  id: string
  name: string
  type: 'Bank Statement' | 'Credit Card' | 'Investment' | 'Receipt' | 'Other'
  status: 'uploading' | 'processing' | 'completed' | 'error'
  uploadDate: string
  transactions?: number
  amount?: string
  fileType: 'pdf' | 'image'
  size: number
}

// Mock API functions
const fetchDocuments = async (): Promise<Document[]> => {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return [
    {
      id: "1",
      name: "HDFC_Statement_Dec2024.pdf",
      type: "Bank Statement",
      status: "completed",
      uploadDate: "2024-12-15",
      transactions: 45,
      amount: "12,450.00",
      fileType: "pdf",
      size: 1024 * 512 // 512KB
    },
    {
      id: "2",
      name: "Credit_Card_Nov2024.pdf",
      type: "Credit Card",
      status: "completed",
      uploadDate: "2024-12-10",
      transactions: 28,
      amount: "5,230.00",
      fileType: "pdf",
      size: 1024 * 256 // 256KB
    },
    {
      id: "3",
      name: "Investment_Statement.pdf",
      type: "Investment",
      status: "processing",
      uploadDate: "2024-12-14",
      fileType: "pdf",
      size: 1024 * 1024 // 1MB
    }
  ]
}

const uploadDocument = async (file: File): Promise<Document> => {
  // Simulate upload progress
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: 'Other',
    status: 'processing',
    uploadDate: new Date().toISOString(),
    fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
    size: file.size
  }
}

const deleteDocument = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500))
}

// Hooks
export const useDocuments = () => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: (newDocument) => {
      // Add the new document to the list
      queryClient.setQueryData<Document[]>(['documents'], (old) => 
        old ? [newDocument, ...old] : [newDocument]
      )
    },
  })
}

export const useDeleteDocument = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_, deletedId) => {
      // Remove document from the list
      queryClient.setQueryData<Document[]>(['documents'], (old) => 
        old?.filter(document => document.id !== deletedId) || []
      )
    },
  })
}