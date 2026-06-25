import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from services.llm_call import getEmbeddings
from services.chromadb import addEmbeddingDataToCollection
from services.models import Embedded_Data
from utils.load_xlsx import load_xlsx
from utils.load_xls import load_xls
from utils.load_pptx import load_pptx


async def process_document(filepath: str, document_id: str):
    chunks = fileChunkHandler(filepath=filepath)    
    embeddedDoc = await generate_document_embeddings(chunks, document_id)
    await addEmbeddingDataToCollection(embeddedDoc)

    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"Error deleting local file {filepath}: {e}")


def fileChunkHandler(filepath: str) -> list[Document]:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        loader = PyPDFLoader(filepath)
        file = loader.load()
    elif ext == ".docx":
        from langchain_community.document_loaders import Docx2txtLoader

        loader = Docx2txtLoader(filepath)
        file = loader.load()
    elif ext == ".doc":
        raise ValueError(
            "Legacy Word .doc format is not supported directly. Please convert it to .docx and re-upload."
        )
    elif ext == ".xlsx":
        file = load_xlsx(filepath)
    elif ext == ".xls":
        file = load_xls(filepath)
    elif ext == ".pptx":
        file = load_pptx(filepath)
    elif ext == ".ppt":
        raise ValueError(
            "Legacy PowerPoint .ppt format is not supported directly. Please convert it to .pptx and re-upload."
        )
    elif ext == ".txt":
        from langchain_community.document_loaders import TextLoader

        loader = TextLoader(filepath, encoding="utf-8")
        file = loader.load()
    elif ext == ".csv":
        from langchain_community.document_loaders import CSVLoader

        loader = CSVLoader(filepath)
        file = loader.load()
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return splitter.split_documents(file)


async def generate_document_embeddings(
    chunks: list[Document], document_id: str
) -> list[Embedded_Data]:
    texts = [doc.page_content for doc in chunks]
    embeddings_response = await getEmbeddings(texts)

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
                metadata={**doc.metadata, "document_id": document_id},
            )
        )
    return document_embeddings

async def process_document_in_background(doc_id: str, filepath: str):
    from db.database import SessionLocal
    from db.models import Document
    from sqlalchemy import select

    async with SessionLocal() as db:
        stmt = select(Document).where(Document.id == doc_id)
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            return
        
        doc.status = "indexing"
        await db.commit()

        try:
            await process_document(filepath, doc_id)
            doc.status = "indexed"
            doc.is_embedded = True
            await db.commit()
        except Exception as e:
            print(f"Error processing document {doc.document_name} in background: {e}")
            doc.status = "failed"
            await db.commit()