import os
import chromadb
from dotenv import load_dotenv
from services.models import Embedded_Data
from chromadb import Search, K, Knn

load_dotenv()

client = chromadb.CloudClient(
    api_key=os.getenv("CHROMA_API_KEY"),
    tenant=os.getenv("CHROMA_TENANT"),
    database=os.getenv("CHROMA_DATABASE")
)

def getCollection():
    return client.get_or_create_collection(name="document_embeddings", embedding_function=None)

def addEmbeddingDataToCollection(embeddingsData: list[Embedded_Data]) -> bool:
    batch_size = 100
    for item in range(0, len(embeddingsData), batch_size):
        batch = embeddingsData[item:item + batch_size]
        collection = getCollection()
        collection.add(
            ids=[chunk.chunk_id for chunk in batch],
            embeddings=[chunk.embeddings for chunk in batch],
            documents=[chunk.text for chunk in batch],
            metadatas=[chunk.metadata for chunk in batch]
        )
    return True

def search_embeddings(vector: list[float], document_ids: list[str]):
    search = (
        Search()
        .where({"document_id": {"$in": document_ids}})
        .limit(5)
        .select(K.DOCUMENT, K.SCORE)
    )
    collection = getCollection()
    return collection.search(search.rank(Knn(query=vector)))

def delete_embeddings(document_ids: list[str]):
    if not document_ids:
        return
    collection = getCollection()
    for doc_id in document_ids:
        try:
            collection.delete(where={"document_id": doc_id})
        except Exception as e:
            print(f"Error deleting embeddings for {doc_id}: {e}")