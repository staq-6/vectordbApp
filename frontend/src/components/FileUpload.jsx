import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

const FileUpload = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const newUploads = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending', // pending, uploading, completed, error
      error: null,
    }));

    setUploadQueue((prev) => [...prev, ...newUploads]);
    newUploads.forEach((upload) => uploadFile(upload));
  };

  const uploadFile = async (upload) => {
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.id === upload.id ? { ...item, status: 'uploading' } : item
      )
    );

    try {
      const response = await api.uploadFile(upload.file, (progress) => {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === upload.id ? { ...item, progress } : item
          )
        );
      });

      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === upload.id
            ? { ...item, status: 'completed', progress: 100 }
            : item
        )
      );

      if (onUploadComplete) {
        onUploadComplete(response);
      }

      // Remove from queue after 3 seconds
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((item) => item.id !== upload.id));
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === upload.id
            ? {
                ...item,
                status: 'error',
                error: error.response?.data?.message || 'Upload failed',
              }
            : item
        )
      );
    }
  };

  const removeFromQueue = (id) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        <Upload
          className={`w-12 h-12 mx-auto mb-4 ${
            isDragging ? 'text-primary-600' : 'text-gray-400'
          }`}
        />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports PDF, TXT, DOCX and other document formats
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          accept=".pdf,.txt,.docx,.doc,.md"
        />
        <label
          htmlFor="file-upload"
          className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-primary-700 transition-colors"
        >
          Select Files
        </label>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Upload Progress
          </h3>
          {uploadQueue.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                {upload.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                )}
                {upload.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {upload.status === 'pending' && (
                  <FileText className="w-5 h-5 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {upload.name}
                  </p>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatFileSize(upload.size)}
                  </span>
                </div>

                {upload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}

                {upload.status === 'completed' && (
                  <p className="text-xs text-green-600">Upload completed</p>
                )}

                {upload.status === 'error' && (
                  <p className="text-xs text-red-600">{upload.error}</p>
                )}
              </div>

              {(upload.status === 'error' || upload.status === 'completed') && (
                <button
                  onClick={() => removeFromQueue(upload.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
