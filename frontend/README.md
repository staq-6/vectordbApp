# Document Chat Assistant - Frontend

A modern, responsive React application for interacting with documents through an AI-powered chat interface.

## Features

- 💬 **Interactive Chat Interface**: Ask questions about your uploaded documents
- 📤 **Document Upload**: Drag-and-drop or browse to upload documents with real-time progress tracking
- 📄 **Document Viewer**: View and select documents while chatting for better context
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
- 📱 **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API requests
- **Lucide React**: Beautiful, consistent icons

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend API running on `http://localhost:8000`

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatBox.jsx          # Chat interface component
│   │   ├── FileUpload.jsx       # File upload with progress
│   │   └── DocumentViewer.jsx   # Document list and viewer
│   ├── services/
│   │   └── api.js               # API service layer
│   ├── App.jsx                  # Main application component
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## API Integration

The app expects the following backend endpoints:

- `POST /api/chat` - Send chat messages
- `POST /api/files/upload` - Upload documents
- `GET /api/files` - List all documents
- `GET /api/files/:id` - Get document content
- `DELETE /api/files/:id` - Delete a document

## Customization

### Colors

Modify the color scheme in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom color palette
      }
    }
  }
}
```

### API Base URL

Update the API base URL in `src/services/api.js` if your backend runs on a different port or domain.

## Building for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. The production files will be in the `dist` directory

3. Deploy the `dist` directory to your hosting service

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
