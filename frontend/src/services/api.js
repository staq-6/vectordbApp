import axios from 'axios';

const API_BASE_URL = '/api';

export const api = {
  // Chat endpoints
  sendMessage: async (message, documentIds = []) => {
    const response = await axios.post(`${API_BASE_URL}/chat`, {
      prompt: message,
    });
    return response.data;
  },

  // File upload endpoints
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Get all files
  getFiles: async () => {
    const response = await axios.get(`${API_BASE_URL}/files`);
    return response.data;
  },

  // Get file content
  getFileContent: async (fileId) => {
    const response = await axios.get(`${API_BASE_URL}/files/${fileId}`);
    return response.data;
  },

  // Delete file
  deleteFile: async (fileId) => {
    const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`);
    return response.data;
  },
};
