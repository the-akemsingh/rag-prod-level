from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.auth import router as auth_router
from routers.chats import router as chats_router
from routers.websocket import router as ws_router
import asyncio
import os
from sqlalchemy import select
from db.database import SessionLocal
from db.models import Document
from services.data_ingestion import process_document
from contextlib import asynccontextmanager
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    retry_task = asyncio.create_task(retry_failed_documents())
    print("Background document retry task started")
    
    yield
    
    print("Shutting down: cancelling background retry task")
    retry_task.cancel()
    try:
        await retry_task
    except asyncio.CancelledError:
        print("Background retry task successfully shut down.")

app = FastAPI(title="RAG Application Backend",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://askdocs-xi.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chats_router)
app.include_router(ws_router)


@app.get("/")
def info():
    return "rag application active"

async def retry_failed_documents():
    while True:
        await asyncio.sleep(60)
        try:
            async with SessionLocal() as db:
                stmt = select(Document).where(
                    Document.status == "failed",
                    Document.is_embedded == False
                )
                result = await db.execute(stmt)
                failed_docs = result.scalars().all()
                
                for doc in failed_docs:
                    file_path = f"uploads/{doc.document_name}"
                    if os.path.exists(file_path):
                        print(f"Retrying document processing for {doc.document_name}...")
                        doc.status = "indexing"
                        await db.commit()
                        try:
                            await process_document(file_path, doc.id)
                            doc.status = "indexed"
                            doc.is_embedded = True
                            await db.commit()
                            print(f"Successfully processed document {doc.document_name} on retry.")
                        except Exception as e:
                            print(f"Retry failed for document {doc.document_name}: {e}")
                            doc.status = "failed"
                            await db.commit()
        except Exception as e:
            print(f"Error in periodic retry loop: {e}")
