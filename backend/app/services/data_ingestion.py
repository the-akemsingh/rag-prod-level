import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from services.llm_call import getEmbeddings
from services.chromadb import addEmbeddingDataToCollection
from services.models import Embedded_Data

def process_document(filepath: str, document_id: str):
    chunks = fileChunkHandler(filepath=filepath)    
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"Error deleting local file {filepath}: {e}")
  
    embeddedDoc = generate_document_embeddings(chunks, document_id)
    addEmbeddingDataToCollection(embeddedDoc)

def fileChunkHandler(filepath: str) -> list[Document]:
    loader = PyPDFLoader(filepath)
    file = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    return splitter.split_documents(file)

def generate_document_embeddings(chunks: list[Document], document_id: str) -> list[Embedded_Data]:
    texts = [doc.page_content for doc in chunks]
    embeddings_response = getEmbeddings(texts)
    
    if not embeddings_response:

        return []

    document_embeddings = []
    for index, (doc, embedding) in enumerate(zip(chunks, embeddings_response)):
        vector = embedding.values
        if vector is None:
            continue

        document_embeddings.append(
            Embedded_Data(
                document_id=document_id,
                chunk_id=f"{document_id}_{index}",
                text=doc.page_content,
                embeddings=vector,
                metadata={
                    **doc.metadata,
                    "document_id": document_id
                }
            )
        )
    return document_embeddings