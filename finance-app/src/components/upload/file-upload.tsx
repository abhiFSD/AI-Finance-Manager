"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Trash2,
  Download
} from "lucide-react"

interface UploadedFile {
  id: string
  file: File
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  extractedData?: {
    transactions?: number
    amount?: string
    dateRange?: string
  }
  error?: string
}

export function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "uploading" as const,
      progress: 0,
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Simulate upload and processing
    newFiles.forEach((uploadedFile) => {
      simulateUpload(uploadedFile.id)
    })
  }, [])

  const simulateUpload = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ))
    }

    // Switch to processing
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: "processing", progress: 0 } : f
    ))

    // Simulate processing
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ))
    }

    // Complete processing
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        status: "completed", 
        progress: 100,
        extractedData: {
          transactions: Math.floor(Math.random() * 50) + 10,
          amount: (Math.random() * 10000).toFixed(2),
          dateRange: "Jan 1 - Dec 31, 2024"
        }
      } : f
    ))
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return FileText
    if (file.type.startsWith('image/')) return Image
    return File
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case "uploading":
      case "processing":
        return Clock
      case "completed":
        return CheckCircle2
      case "error":
        return XCircle
      default:
        return File
    }
  }

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case "uploading":
      case "processing":
        return "text-blue-600"
      case "completed":
        return "text-green-600"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Drag and drop your bank statements, receipts, or investment documents. 
            Supported formats: PDF, JPG, PNG (Max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
              ${isDragActive && !isDragReject ? 'border-primary bg-primary/5' : ''}
              ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}
              ${!isDragActive ? 'border-muted-foreground/25 hover:border-muted-foreground/50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              isDragReject ? (
                <div>
                  <p className="text-lg font-medium text-red-600">Invalid file type</p>
                  <p className="text-sm text-red-500">Please upload PDF, JPG, or PNG files only</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">Drop files here</p>
                  <p className="text-sm text-muted-foreground">Release to upload</p>
                </div>
              )
            ) : (
              <div>
                <p className="text-lg font-medium">Drag & drop files here</p>
                <p className="text-sm text-muted-foreground">
                  or <Button variant="link" className="p-0 h-auto">browse files</Button>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue</CardTitle>
            <CardDescription>
              Track the progress of your document processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((uploadedFile) => {
              const FileIcon = getFileIcon(uploadedFile.file)
              const StatusIcon = getStatusIcon(uploadedFile.status)
              const statusColor = getStatusColor(uploadedFile.status)

              return (
                <div key={uploadedFile.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{uploadedFile.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                      <span className={`text-sm ${statusColor} capitalize`}>
                        {uploadedFile.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadedFile.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(uploadedFile.status === "uploading" || uploadedFile.status === "processing") && (
                    <div className="space-y-2">
                      <Progress value={uploadedFile.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {uploadedFile.status === "uploading" ? "Uploading..." : "Processing document..."}
                        {" "}({uploadedFile.progress}%)
                      </p>
                    </div>
                  )}

                  {uploadedFile.status === "completed" && uploadedFile.extractedData && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-center">
                          <span>
                            Extracted {uploadedFile.extractedData.transactions} transactions 
                            (${uploadedFile.extractedData.amount}) from {uploadedFile.extractedData.dateRange}
                          </span>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {uploadedFile.status === "error" && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        {uploadedFile.error || "Failed to process document. Please try again."}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}