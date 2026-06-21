from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.auth import router as auth_router
from routers.chats import router as chats_router
from routers.websocket import router as ws_router

load_dotenv()

app = FastAPI(title="RAG Application Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
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
