import os
from typing import List
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.auth_oidc import OIDCCallback, OIDCCallbackContext, OIDCCallbackResult
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.storage.blob import BlobServiceClient
from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter
from langchain_community.vectorstores.azure_cosmos_db import (
    AzureCosmosDBVectorSearch,
    CosmosDBSimilarityType
)
# Use ONLY this import for embeddings
from langchain_openai import AzureOpenAIEmbeddings

load_dotenv()

credential = DefaultAzureCredential()

# ---------------------------
# Cosmos DB Connection
# ---------------------------
class AzureIdentityTokenCallback(OIDCCallback):
    def __init__(self, credential):
        self.credential = credential

    def fetch(self, context: OIDCCallbackContext) -> OIDCCallbackResult:
        # Scope for Azure Cosmos DB for MongoDB vCore
        token = self.credential.get_token(
            "https://ossrdbms-aad.database.windows.net/.default"
        ).token
        return OIDCCallbackResult(access_token=token)

def get_cosmos_collection():
    cluster_name = os.getenv("MONGO_CLUSTER_NAME")
    if not cluster_name:
        raise ValueError("MONGO_CLUSTER_NAME environment variable is required")

    auth_properties = {"OIDC_CALLBACK": AzureIdentityTokenCallback(credential)}

    client = MongoClient(
        f"mongodb+srv://{cluster_name}.global.mongocluster.cosmos.azure.com/",
        connectTimeoutMS=120000,
        tls=True,
        retryWrites=True,
        authMechanism="MONGODB-OIDC",
        authMechanismProperties=auth_properties
    )

    db_name = os.getenv("COSMOS_DB_NAME")
    collection_name = os.getenv("COSMOS_COLLECTION_NAME")
    return client.get_database(db_name).get_collection(collection_name)

# ---------------------------
# Azure OpenAI Embeddings (Fixed for Managed Identity)
# ---------------------------
def get_azure_openai_embeddings():
    # Use this to generate tokens for Azure OpenAI specifically
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )

    # Ensure this is ONLY the base URL (e.g., https://resourcename.openai.azure.com/)
    azure_endpoint = os.getenv("AZURE_OPENAI_EMBEDDING_ENDPOINT")
    deployment_name = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
    
    # Remove any trailing slashes and ensure it's just the base URL
    if azure_endpoint:
        azure_endpoint = azure_endpoint.rstrip('/')
        # Remove /openai if accidentally included
        if azure_endpoint.endswith('/openai'):
            azure_endpoint = azure_endpoint[:-7]
    
    return AzureOpenAIEmbeddings(
        azure_deployment=deployment_name,
        azure_endpoint=azure_endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2024-02-01",  # Add explicit API version
        chunk_size=1
    )

# ---------------------------
# Azure Blob Storage Upload
# ---------------------------
def upload_to_blob_storage(file_content, blob_name: str) -> str:
    """
    Upload file to Azure Blob Storage container
    Returns the blob URL
    """
    storage_account_name = os.getenv("STORAGE_ACCOUNT_NAME")
    container_name = os.getenv("STORAGE_CON_NAME_RAW")
    
    account_url = f"https://{storage_account_name}.blob.core.windows.net"
    blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
    
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    
    # Reset file pointer to beginning if it's a file-like object
    if hasattr(file_content, 'seek'):
        file_content.seek(0)
    
    blob_client.upload_blob(file_content, overwrite=True)
    
    return blob_client.url

# ---------------------------
# Helper Functions
# ---------------------------
def document_exists_in_db(collection, blob_name: str) -> bool:
    """
    Check if a document with the given blob_name already exists in the database
    """
    existing_doc = collection.find_one({"metadata.source": blob_name})
    return existing_doc is not None

# ---------------------------
# Vectorisation Function
# ---------------------------
def vectorise_file(file_content, blob_name: str):
    # Check if document already exists in vector database
    collection = get_cosmos_collection()
    
    if document_exists_in_db(collection, blob_name):
        print(f"Document '{blob_name}' already exists in vector database. Skipping upload and vectorization.")
        return {"status": "skipped", "message": "Document already exists in database"}
    
    # 0. Upload to Blob Storage first
    blob_url = upload_to_blob_storage(file_content, blob_name)
    print(f"File uploaded to: {blob_url}")
    
    # Reset file pointer after upload for Document Intelligence
    if hasattr(file_content, 'seek'):
        file_content.seek(0)
    
    # 1. Parse document
    client = DocumentAnalysisClient(
        endpoint=os.getenv("DOC_INTEL_ENDPOINT"),
        credential=credential
    )
    poller = client.begin_analyze_document(
        model_id="prebuilt-layout",
        document=file_content
    )
    result = poller.result()

    # 2. Convert to LangChain Documents
    documents: List[Document] = []
    for page in result.pages:
        page_text = ""
        for line in page.lines:
            page_text += line.content + "\n"

        for table in result.tables:
            if table.bounding_regions and table.bounding_regions[0].page_number == page.page_number:
                for cell in table.cells:
                    page_text += cell.content + " | "
                page_text += "\n"

        doc = Document(
            page_content=page_text.strip(),
            metadata={"source": blob_name, "page_no": page.page_number}
        )
        documents.append(doc)

    # 3. Split into chunks
    splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=500,
        chunk_overlap=200
    )
    docs = splitter.split_documents(documents)

    # 4. Get embeddings and Store
    embeddings = get_azure_openai_embeddings()
    
    vectorstore = AzureCosmosDBVectorSearch.from_documents(
        docs,
        embeddings,
        collection=collection,
        index_name="vectorSearchIndex",
        embedding_key="embedding",
        text_key="text"
    )

    # Note: Dimensions for ada-002 is 1536
    vectorstore.create_index(
        num_lists=1,
        dimensions=1536
    )

    return {"status": "success", "message": "Document vectorized successfully"}