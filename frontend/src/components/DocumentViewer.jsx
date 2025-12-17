import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileText, Trash2, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';

const DocumentViewer = forwardRef(({ onDocumentSelect, selectedDocuments }, ref) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [fileType, setFileType] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching files from API...');
      const files = await api.getFiles();
      console.log('Received files:', files);
      setDocuments(files);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refreshDocuments: loadDocuments
  }));

  const handleDocumentClick = (doc) => {
    const isSelected = selectedDocuments.some((d) => d.id === doc.id);
    if (isSelected) {
      onDocumentSelect(selectedDocuments.filter((d) => d.id !== doc.id));
    } else {
      onDocumentSelect([...selectedDocuments, doc]);
    }
  };

  const handleViewDocument = async (doc) => {
    setViewingDocument(doc);
    setIsLoadingContent(true);
    setDocumentContent('');
    setDocumentUrl(null);
    
    try {
      // Determine file type
      const extension = doc.name.split('.').pop().toLowerCase();
      setFileType(extension);
      
      // For PDFs and images, use blob URL
      if (['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) {
        const response = await fetch(`/api/files/${encodeURIComponent(doc.id)}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
      } else {
        // For text files, get content as text
        const content = await api.getFileContent(doc.id);
        setDocumentContent(content.content || content.text || 'No content available');
      }
    } catch (error) {
      console.error('Error loading document content:', error);
      setDocumentContent('Error loading document content');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const closeDocumentViewer = () => {
    setViewingDocument(null);
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl);
      setDocumentUrl(null);
    }
  };

  const handleDeleteDocument = async (doc, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;

    try {
      await api.deleteFile(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      onDocumentSelect(selectedDocuments.filter((d) => d.id !== doc.id));
      if (viewingDocument?.id === doc.id) {
        setViewingDocument(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-primary-100 mt-1">
          {selectedDocuments.length} selected
        </p>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isSelected = selectedDocuments.some((d) => d.id === doc.id);
              return (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewDocument(doc)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-1">
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {doc.name || doc.filename || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(doc.uploaded_at || doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDocumentClick(doc);
                        }}
                        className={`p-1 transition-colors ${
                          isSelected 
                            ? 'text-primary-600 hover:text-primary-700' 
                            : 'text-gray-400 hover:text-primary-600'
                        }`}
                        title={isSelected ? "Deselect from chat" : "Select for chat"}
                      >
                        {isSelected ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDeleteDocument(doc, e)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Content Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 truncate">
                {viewingDocument.name || viewingDocument.filename}
              </h3>
              <button
                onClick={closeDocumentViewer}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {isLoadingContent ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  {/* PDF Viewer */}
                  {fileType === 'pdf' && documentUrl && (
                    <iframe
                      src={documentUrl}
                      className="w-full h-full min-h-[600px]"
                      title="PDF Viewer"
                    />
                  )}
                  
                  {/* Image Viewer */}
                  {['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(fileType) && documentUrl && (
                    <div className="flex items-center justify-center p-6 bg-gray-50 h-full">
                      <img
                        src={documentUrl}
                        alt={viewingDocument.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  
                  {/* Text Viewer */}
                  {!documentUrl && documentContent && (
                    <div className="p-6">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {documentContent}
                      </pre>
                    </div>
                  )}
                  
                  {/* Error or Empty State */}
                  {!documentUrl && !documentContent && !isLoadingContent && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>Unable to display this file type</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DocumentViewer;
