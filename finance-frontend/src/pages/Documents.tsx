import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  LinearProgress,
  Alert,
  Fab,
  Tooltip,
} from '@mui/material';
// import { Grid } from '@mui/material';
import {
  CloudUpload,
  MoreVert,
  Download,
  Delete,
  Edit,
  Search,
  FilterList,
  Folder,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  Description,
  Add,
  Visibility,
  TableChart,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { Document, DocumentCategory, DocumentFilters } from '../types';
import { documentService } from '../services/document.service';
import { formatFileSize, formatDate } from '../utils/formatters';
import { validateFile } from '../utils/validators';
import LoadingSpinner from '../components/LoadingSpinner';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [newDocumentCategory, setNewDocumentCategory] = useState<DocumentCategory>('receipt');
  const [newDocumentTags, setNewDocumentTags] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [editCategory, setEditCategory] = useState<DocumentCategory>('receipt');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadDocuments();
  }, [filters, searchQuery]);

  const loadDocuments = async (reset = true) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const searchFilters = {
        ...filters,
        search: searchQuery || undefined,
      };

      const response = await documentService.getDocuments(
        currentPage,
        20,
        searchFilters
      );

      // Handle different API response structures with null checks
      const resData: any = response?.data || response;
      const documents = resData?.documents || resData?.data?.documents || resData?.data || [];

      if (reset) {
        setDocuments(documents);
        setPage(1);
      } else {
        setDocuments(prev => [...prev, ...documents]);
      }
      
      setHasMore(documents.length === 20);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadDocuments(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesUpload,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  async function handleFilesUpload(files: File[]) {
    const validFiles = files.filter(file => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        console.error(`Invalid file ${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    const newProgress = validFiles.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadProgress(newProgress);
    setUploadDialogOpen(true);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        await documentService.uploadDocument(
          file,
          newDocumentCategory,
          newDocumentTags.split(',').map(tag => tag.trim()).filter(Boolean)
        );

        setUploadProgress(prev =>
          prev.map((item, index) =>
            index === i
              ? { ...item, progress: 100, status: 'success' }
              : item
          )
        );
      } catch (error) {
        setUploadProgress(prev =>
          prev.map((item, index) =>
            index === i
              ? { 
                  ...item, 
                  status: 'error', 
                  error: 'Upload failed' 
                }
              : item
          )
        );
      }
    }

    // Refresh documents after upload
    setTimeout(() => {
      loadDocuments();
      if (uploadProgress.every(p => p.status === 'success')) {
        setUploadDialogOpen(false);
      }
    }, 1000);
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    event.stopPropagation();
    setSelectedDocument(document);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleView = () => {
    if (selectedDocument) {
      window.open(documentService.getDocumentPreviewUrl(selectedDocument.id), '_blank');
    }
    handleMenuClose();
  };

  const handleDownload = async () => {
    if (selectedDocument) {
      try {
        const blob = await documentService.downloadDocument(selectedDocument.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = selectedDocument.originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedDocument) {
      setEditCategory(selectedDocument.category);
      setEditTags(selectedDocument.tags?.join(', ') || '');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (selectedDocument) {
      try {
        await documentService.deleteDocument(selectedDocument.id);
        loadDocuments();
        setDeleteDialogOpen(false);
        setSelectedDocument(null);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const saveDocumentChanges = async () => {
    if (selectedDocument) {
      try {
        await documentService.updateDocument(selectedDocument.id, {
          category: editCategory,
          tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean),
        });
        loadDocuments();
        setEditDialogOpen(false);
        setSelectedDocument(null);
      } catch (error) {
        console.error('Error updating document:', error);
      }
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image sx={{ fontSize: 48, color: 'info.main' }} />;
    } else if (mimeType === 'application/pdf') {
      return <PictureAsPdf sx={{ fontSize: 48, color: 'error.main' }} />;
    } else if (mimeType === 'text/plain') {
      return <Description sx={{ fontSize: 48, color: 'success.main' }} />;
    } else if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return <TableChart sx={{ fontSize: 48, color: 'success.dark' }} />;
    } else {
      return <InsertDriveFile sx={{ fontSize: 48, color: 'action.active' }} />;
    }
  };

  const getCategoryColor = (category: DocumentCategory) => {
    const colorMap = {
      receipt: 'primary',
      invoice: 'secondary',
      statement: 'success',
      tax: 'warning',
      contract: 'info',
      other: 'default',
    };
    return colorMap[category] as any;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Documents
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Documents
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
          <TextField
            fullWidth
            label="Search documents"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
        </Box>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(25% - 18px)' } }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category || ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value as DocumentCategory })}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="receipt">Receipt</MenuItem>
              <MenuItem value="invoice">Invoice</MenuItem>
              <MenuItem value="statement">Statement</MenuItem>
              <MenuItem value="tax">Tax</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(25% - 18px)' } }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setFilters({})}
            sx={{ height: '56px' }}
          >
            Clear Filters
          </Button>
        </Box>
      </Box>

      {/* Documents Grid */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {(documents || []).map((document) => (
          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)', lg: 'calc(25% - 18px)' } }} key={document.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate(`/documents/${document.id}/review`)}
            >
              <Box
                sx={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                }}
              >
                {document.mimeType.startsWith('image/') ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={documentService.getDocumentThumbnailUrl(document.id)}
                    alt={document.originalName}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  getFileIcon(document.mimeType)
                )}
              </Box>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'start', mb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    component="div"
                    sx={{
                      fontWeight: 'bold',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {document.originalName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, document)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
                
                <Chip
                  size="small"
                  label={document.category}
                  color={getCategoryColor(document.category)}
                  sx={{ mb: 1 }}
                />
                
                <Typography variant="body2" color="textSecondary">
                  {formatFileSize(document.fileSize)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDate(document.uploadedAt, 'relative')}
                </Typography>
                
                {document.tags && document.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {document.tags.slice(0, 2).map((tag) => (
                      <Chip
                        key={tag}
                        size="small"
                        label={tag}
                        variant="outlined"
                      />
                    ))}
                    {document.tags.length > 2 && (
                      <Typography variant="caption" color="textSecondary">
                        +{document.tags.length - 2} more
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Load More Button */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button variant="outlined" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}

      {/* Empty State */}
      {(documents || []).length === 0 && !loading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            textAlign: 'center',
          }}
        >
          <Folder sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No documents found
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Upload your first document to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Documents
          </Button>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <Download fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newDocumentCategory}
                  onChange={(e) => setNewDocumentCategory(e.target.value as DocumentCategory)}
                  label="Category"
                >
                  <MenuItem value="receipt">Receipt</MenuItem>
                  <MenuItem value="invoice">Invoice</MenuItem>
                  <MenuItem value="statement">Statement</MenuItem>
                  <MenuItem value="tax">Tax</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={newDocumentTags}
                onChange={(e) => setNewDocumentTags(e.target.value)}
                placeholder="receipt, business, 2024"
              />
            </Box>
          </Box>

          <Paper
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supports: Images, PDFs, Text files (Max 10MB each)
            </Typography>
          </Paper>

          {uploadProgress.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upload Progress
              </Typography>
              {uploadProgress.map((progress, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">{progress.fileName}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {progress.status === 'success' ? 'Complete' : 
                       progress.status === 'error' ? 'Failed' : 
                       `${progress.progress}%`}
                    </Typography>
                  </Box>
                  {progress.status === 'uploading' && (
                    <LinearProgress variant="determinate" value={progress.progress} />
                  )}
                  {progress.status === 'error' && (
                    <Alert severity="error">{progress.error}</Alert>
                  )}
                  {progress.status === 'success' && (
                    <Alert severity="success">Upload completed successfully</Alert>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            {uploadProgress.every(p => p.status === 'success') ? 'Done' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                  label="Category"
                >
                  <MenuItem value="receipt">Receipt</MenuItem>
                  <MenuItem value="invoice">Invoice</MenuItem>
                  <MenuItem value="statement">Statement</MenuItem>
                  <MenuItem value="tax">Tax</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveDocumentChanges} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this document? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="upload document"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUploadDialogOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Documents;