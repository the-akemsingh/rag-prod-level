import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db.models import Chat, Message, Document
from dependencies import getUser, resolve_user
from services.data_ingestion import process_document
from services.chromadb import delete_embeddings

router = APIRouter(prefix="/chats", tags=["chats"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_chat(
    payload: dict = Depends(getUser),
    db: AsyncSession = Depends(get_db)
):
    user = await resolve_user(payload, db)
    chat = Chat(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title="New Chat"
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return {"id": chat.id, "title": chat.title, "created_at": chat.created_at}

@router.get("")
async def list_chats(
    payload: dict = Depends(getUser),
    db: AsyncSession = Depends(get_db)
):
    user = await resolve_user(payload, db)
    stmt = select(Chat).where(Chat.user_id == user.id).order_by(Chat.created_at.desc())
    result = await db.execute(stmt)
    chats = result.scalars().all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in chats]

@router.delete("/{chat_id}", status_code=status.HTTP_200_OK)
async def delete_chat(
    chat_id: str,
    payload: dict = Depends(getUser),
    db: AsyncSession = Depends(get_db)
):
    user = await resolve_user(payload, db)

    chat_stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
    chat_result = await db.execute(chat_stmt)
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "Chat not found")

    doc_stmt = select(Document).where(Document.chat_id == chat_id)
    doc_result = await db.execute(doc_stmt)
    docs = doc_result.scalars().all()

    doc_ids = [d.id for d in docs]
    if doc_ids:
        delete_embeddings(doc_ids)

    await db.execute(delete(Message).where(Message.chat_id == chat_id))
    await db.execute(delete(Document).where(Document.chat_id == chat_id))
    await db.execute(delete(Chat).where(Chat.id == chat_id))
    await db.commit()

    return {"message": "Chat deleted successfully"}

@router.get("/{chat_id}/messages")
async def get_messages(
    chat_id: str,
    payload: dict = Depends(getUser),
    db: AsyncSession = Depends(get_db)
):
    user = await resolve_user(payload, db)
    chat_stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
    chat_result = await db.execute(chat_stmt)
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "Chat not found")

    stmt = select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.asc())
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]

@router.post("/{chat_id}/upload-doc", status_code=status.HTTP_201_CREATED)
async def upload_documents(
    chat_id: str,
    files: list[UploadFile] = File(...),
    payload: dict = Depends(getUser),
    db: AsyncSession = Depends(get_db)
):
    user = await resolve_user(payload, db)

    if chat_id == "new":
        chat = Chat(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title="New Chat"
        )
        db.add(chat)
    else:
        chat_stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
        chat_result = await db.execute(chat_stmt)
        chat = chat_result.scalar_one_or_none()
        if not chat:
            raise HTTPException(404, "Chat not found")

    documents_created = []
    os.makedirs("uploads", exist_ok=True)

    for file in files:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        document_id = str(uuid.uuid4())
        document = Document(
            id=document_id,
            document_name=file.filename,
            user_id=user.id,
            chat_id=chat.id,
            is_embedded=False
        )
        db.add(document)
        
        if not chat.title or chat.title == "New Chat":
            chat.title = file.filename
            
        documents_created.append((document, file_path))

    await db.commit()

    for doc, path in documents_created:
        try:
            process_document(path, doc.id)
            doc.is_embedded = True
            await db.commit()

            doc_msg = Message(
                id=str(uuid.uuid4()),
                chat_id=chat.id,
                role="document",
                content=doc.document_name
            )
            db.add(doc_msg)
            await db.commit()
        except Exception as e:
            raise HTTPException(500, f"Failed to process document {doc.document_name}: {e}")

    return {
        "message": "uploaded",
        "chat_id": chat.id,
        "chat_title": chat.title,
        "documents": [{"id": doc.id, "name": doc.document_name} for doc, _ in documents_created]
    }
