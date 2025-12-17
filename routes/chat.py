from fastapi import APIRouter
from pydantic import BaseModel
from services.vector_search import perform_rag
import asyncio
from functools import lru_cache

router = APIRouter()

class ChatQuery(BaseModel):
    prompt: str

# Cache for embeddings and vector store to avoid re-initialization
_vectorstore_cache = None

@router.post("/chat")
async def chat_endpoint(query: ChatQuery):
    """
    Fast async chat endpoint with inline citations
    """
    # Run the RAG in a thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    answer, sources = await loop.run_in_executor(None, perform_rag, query.prompt)
    
    # Return only the answer - citations are included in the response text
    return {"answer": answer}