import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import chat, filecrud
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RAG API")

# Add CORS middleware
allowed_origins = os.getenv("CORS_ORIGINS").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.include_router(chat.router, prefix="/api")
app.include_router(filecrud.router, prefix="/api/files")

if __name__ == "__main__":
    host = os.getenv("HOST")
    port = int(os.getenv("PORT"))
    uvicorn.run("main:app", host=host, port=port, reload=True)