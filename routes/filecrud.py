from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from services.vectorisation import vectorise_file, get_cosmos_collection
from typing import List
from bson import ObjectId
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
import os
import io

router = APIRouter()

credential = DefaultAzureCredential()

def get_blob_service_client():
    """Get Azure Blob Storage client"""
    storage_account_name = os.getenv("STORAGE_ACCOUNT_NAME")
    account_url = f"https://{storage_account_name}.blob.core.windows.net"
    return BlobServiceClient(account_url=account_url, credential=credential)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    content = await file.read()
    success = vectorise_file(content, file.filename)
    return {"message": "File processed and embedded successfully", "filename": file.filename}

@router.get("/")
async def list_files():
    """
    Get list of all files from Azure Blob Storage
    """
    try:
        container_name = os.getenv("STORAGE_CON_NAME_RAW")
        blob_service_client = get_blob_service_client()
        container_client = blob_service_client.get_container_client(container_name)
        
        # List all blobs in the container
        blobs = container_client.list_blobs()
        
        result = []
        for blob in blobs:
            result.append({
                "id": blob.name,
                "name": blob.name,
                "filename": blob.name,
                "uploaded_at": blob.last_modified.isoformat() if blob.last_modified else None,
                "size": blob.size,
                "content_type": blob.content_settings.content_type if blob.content_settings else None
            })
        
        print(f"Found {len(result)} files in blob storage")
        return result
    except Exception as e:
        print(f"Error listing files: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/{file_id:path}")
async def get_file_content(file_id: str):
    """
    Get the actual file from Azure Blob Storage
    Returns the raw file for binary files (PDF, images) or JSON with content for text files
    """
    try:
        container_name = os.getenv("STORAGE_CON_NAME_RAW")
        blob_service_client = get_blob_service_client()
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=file_id)
        
        # Check if blob exists
        if not blob_client.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get blob properties
        blob_properties = blob_client.get_blob_properties()
        content_type = blob_properties.content_settings.content_type if blob_properties.content_settings else 'application/octet-stream'
        
        # Download blob content
        blob_data = blob_client.download_blob()
        content = blob_data.readall()
        
        # Determine file extension
        extension = file_id.split('.')[-1].lower() if '.' in file_id else ''
        
        # For PDFs and images, return the raw binary file
        if extension in ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] or content_type.startswith('image/') or content_type == 'application/pdf':
            # Set proper content type based on extension if not set
            if not content_type or content_type == 'application/octet-stream':
                content_type_map = {
                    'pdf': 'application/pdf',
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'gif': 'image/gif',
                    'svg': 'image/svg+xml',
                    'webp': 'image/webp'
                }
                content_type = content_type_map.get(extension, 'application/octet-stream')
            
            return StreamingResponse(
                io.BytesIO(content),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'inline; filename="{file_id}"',
                    "Content-Length": str(len(content))
                }
            )
        
        # For text files, try to decode and return as JSON
        try:
            text_content = content.decode('utf-8')
            return {
                "content": text_content,
                "filename": file_id,
                "size": len(content)
            }
        except UnicodeDecodeError:
            # If decode fails, return as binary stream
            return StreamingResponse(
                io.BytesIO(content),
                media_type=content_type or 'application/octet-stream',
                headers={
                    "Content-Disposition": f'attachment; filename="{file_id}"',
                    "Content-Length": str(len(content))
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting file content: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error retrieving file content")

@router.delete("/{file_id:path}")
async def delete_file(file_id: str):
    """
    Delete file from both Azure Blob Storage and Vector Database
    """
    try:
        container_name = os.getenv("STORAGE_CON_NAME_RAW")
        
        # Delete from blob storage
        blob_service_client = get_blob_service_client()
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=file_id)
        
        if not blob_client.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        blob_client.delete_blob()
        print(f"Deleted blob: {file_id}")
        
        # Also delete from vector database
        collection = get_cosmos_collection()
        result = collection.delete_many({"source": file_id})
        print(f"Deleted {result.deleted_count} vector chunks for {file_id}")
        
        return {
            "message": f"Successfully deleted file '{file_id}'",
            "deleted_chunks": result.deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting file: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error deleting file")