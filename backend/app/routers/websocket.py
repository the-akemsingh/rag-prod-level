import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db.models import Chat, Document, Message
from dependencies import decode_jwt, resolve_user
from services.LangGraph import agent

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/chat/{chat_id}")
async def websocket_chat(
    websocket: WebSocket,
    chat_id: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()

    try:
        payload = decode_jwt(token)
    except Exception:
        await websocket.send_json({"error": "Invalid token"})
        await websocket.close(code=1008)
        return

    user = await resolve_user(payload, db)

    chat_stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
    chat_result = await db.execute(chat_stmt)
    chat = chat_result.scalar_one_or_none()
    if not chat:
        await websocket.send_json({"error": "Chat not found"})
        await websocket.close(code=1008)
        return

    doc_stmt = select(Document).where(Document.chat_id == chat_id)
    doc_result = await db.execute(doc_stmt)
    documents = doc_result.scalars().all()
    if not documents:
        await websocket.send_json({"error": "No document uploaded for this chat yet"})
        await websocket.close(code=1008)
        return

    document_ids = [doc.id for doc in documents]

    history_stmt = (
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
    )
    history_result = await db.execute(history_stmt)
    history_messages = history_result.scalars().all()

    chat_history = []
    for message in history_messages:
        history_item = {
            "role": message.role,
            "content": message.content,
        }

        if message.role == "document":
            history_item["document_name"] = message.content

        chat_history.append(history_item)
    
    try:
        while True:
            data = await websocket.receive_json()
            user_message = data.get("message", "").strip()
            if not user_message:
                continue

            user_msg = Message(
                id=str(uuid.uuid4()),
                chat_id=chat_id,
                role="user",
                content=user_message
            )
            db.add(user_msg)
            await db.commit()
            
            graph_result = await agent.ainvoke({
                "userMessage":user_message,
                "document_ids":document_ids,
                "chat_history": chat_history,
            })
            
            answer = graph_result["llmResponse"]

            assistant_msg = Message(
                id=str(uuid.uuid4()),
                chat_id=chat_id,
                role="assistant",
                content=answer
            )
            db.add(assistant_msg)
            await db.commit()

            await websocket.send_json({"response": answer})

    except WebSocketDisconnect:
        pass
