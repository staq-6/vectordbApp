import React, { useState, useRef } from 'react';
import ChatBox from './components/ChatBox';
import FileUpload from './components/FileUpload';
import DocumentViewer from './components/DocumentViewer';
import { FileText, MessageSquare, Upload as UploadIcon, Menu, X } from 'lucide-react';

function App() {
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'upload'
  const [showDocumentViewer, setShowDocumentViewer] = useState(true);
  const documentViewerRef = useRef(null);

  const handleUploadComplete = () => {
    // Refresh document list
    console.log('Upload completed, refreshing document list');
    if (documentViewerRef.current) {
      documentViewerRef.current.refreshDocuments();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Document Chat Assistant
                </h1>
                <p className="text-sm text-gray-500">
                  Upload, analyze, and chat with your documents
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDocumentViewer(!showDocumentViewer)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {showDocumentViewer ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Left Section - Chat and Upload */}
          <div className="flex-1 flex flex-col space-y-6">
            {/* Tab Navigation (Mobile/Tablet) */}
            <div className="lg:hidden flex bg-white rounded-lg shadow-sm p-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <UploadIcon className="w-5 h-5" />
                <span className="font-medium">Upload</span>
              </button>
            </div>

            {/* Chat Section */}
            <div
              className={`flex-1 ${
                activeTab === 'chat' || window.innerWidth >= 1024 ? 'block' : 'hidden'
              } lg:block`}
            >
              <ChatBox selectedDocuments={selectedDocuments} />
            </div>

            {/* Upload Section */}
            <div
              className={`${
                activeTab === 'upload' || window.innerWidth >= 1024 ? 'block' : 'hidden'
              } lg:block`}
            >
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <UploadIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Upload Documents
                  </h2>
                </div>
                <FileUpload onUploadComplete={handleUploadComplete} />
              </div>
            </div>
          </div>

          {/* Right Section - Document Viewer */}
          <div
            className={`w-full lg:w-96 ${
              showDocumentViewer ? 'block' : 'hidden'
            } lg:block`}
          >
            <DocumentViewer
              ref={documentViewerRef}
              onDocumentSelect={setSelectedDocuments}
              selectedDocuments={selectedDocuments}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 whitespace-nowrap">
            Powered by AI • Upload documents and start asking questions
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
