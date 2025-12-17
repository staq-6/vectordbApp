import os
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings, AzureChatOpenAI
from langchain_community.vectorstores.azure_cosmos_db import AzureCosmosDBVectorSearch
from services.vectorisation import get_cosmos_collection, get_azure_openai_embeddings
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

load_dotenv()

credential = DefaultAzureCredential()

# Cache LLM and embeddings to avoid re-initialization
_llm_cache = None
_embeddings_cache = None
_vectorstore_cache = None

def get_azure_chat_openai():
    """
    Get Azure AI Foundry Chat model with managed identity authentication (cached)
    """
    global _llm_cache
    if _llm_cache is not None:
        return _llm_cache
        
    # Use managed identity token provider
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )
    
    # Azure AI Foundry endpoint
    azure_endpoint = os.getenv("AZURE_FOUNDRY_CHAT_ENDPOINT")
    deployment_name = os.getenv("AZURE_FOUNDRY_CHAT_DEPLOYMENT")
    
    # Remove any trailing slashes
    if azure_endpoint:
        azure_endpoint = azure_endpoint.rstrip('/')
    
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    
    _llm_cache = AzureChatOpenAI(
        azure_deployment=deployment_name,
        azure_endpoint=azure_endpoint,
        azure_ad_token_provider=token_provider,
        api_version=api_version
    )
    return _llm_cache

def perform_rag(query: str, k: int = 3):
    """
    Perform Retrieval Augmented Generation (RAG) on the query
    
    Args:
        query: User's question
        k: Number of similar documents to retrieve
        
    Returns:
        tuple: (response_content, retrieved_documents)
    """
    global _embeddings_cache, _vectorstore_cache
    
    # Get or cache embeddings
    if _embeddings_cache is None:
        _embeddings_cache = get_azure_openai_embeddings()
    
    # Get or cache vectorstore
    if _vectorstore_cache is None:
        collection = get_cosmos_collection()
        _vectorstore_cache = AzureCosmosDBVectorSearch(
            collection=collection,
            embedding=_embeddings_cache,
            index_name="vectorSearchIndex",
            embedding_key="embedding",
            text_key="text"
        )

    # Perform similarity search with scores
    print(f"Searching for top {k} similar documents...")
    docs_with_scores = _vectorstore_cache.similarity_search_with_score(query, k=k)
    
    # Get LLM
    llm = get_azure_chat_openai()
    
    # Filter documents by relevance score
    # Azure Cosmos DB returns similarity scores where higher is better (1.0 = identical)
    relevant_docs = []
    relevance_threshold = 0.3  # Minimum similarity score to consider relevant
    
    for doc, score in docs_with_scores:
        print(f"Document score: {score} from {doc.metadata.get('source', 'Unknown')}")
        if score > relevance_threshold:  # Higher score = more similar
            relevant_docs.append(doc)
    
    # If no relevant documents or query is too generic, use generic chat
    generic_patterns = ['hi', 'hello', 'hey', 'how are you', 'what', 'who are you', 'thanks', 'thank you', 'good morning', 'good afternoon', 'good evening']
    query_lower = query.lower().strip()
    is_generic = any(pattern == query_lower or (len(query_lower.split()) <= 2 and pattern in query_lower) for pattern in generic_patterns)
    
    if not relevant_docs or is_generic:
        # No relevant documents found - use generic chat
        print("No relevant documents found or generic query, using generic chat...")
        response = llm.invoke(query)
        return response.content, []
    
    # Build context from retrieved documents (optimized)
    context_parts = [
        f"[Document {i} - Source: {doc.metadata.get('source', 'Unknown')}, Page: {doc.metadata.get('page_no', 'N/A')}]\n{doc.page_content}"
        for i, doc in enumerate(relevant_docs, 1)
    ]
    context = "\n\n".join(context_parts)
    
    # RAG Prompt - modified to include inline citations
    prompt = f"""You are a helpful AI assistant. Based on the following context from the documents, please answer the question.

IMPORTANT: When using information from the documents, include inline citations in your response using this format: [Source: filename, Page X]
For example: "The total amount is $1,234.56 [Source: Invoice 90389740.pdf, Page 1]"

If the context is relevant, use it to provide a detailed answer with citations.
If the answer cannot be found in the context but you can answer based on your general knowledge, provide a helpful response without citations.

Context:
{context}

Question: {query}

Answer:"""
    
    print("Generating response from Azure OpenAI...")
    response = llm.invoke(prompt)
    
    return response.content, relevant_docs