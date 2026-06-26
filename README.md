<div align="center">

# 📄 AskDocs

### Chat with your documents using AI-powered Retrieval-Augmented Generation

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-Google_AI-4285F4?logo=google)](https://ai.google.dev/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Cloud-orange)](https://www.trychroma.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1.3-green)](https://www.langchain.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Async-336791?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Live Demo →](https://askdocs-xi.vercel.app)**

</div>

---

## 🧠 What is AskDocs?

**AskDocs** is a production-grade, self-reflective RAG (Retrieval-Augmented Generation) application that lets users upload multiple formats of documents and have intelligent, context-aware conversations. Powered by Google's Gemini models and a vector search pipeline orchestrated by **LangGraph**, it evaluates retrieval quality on the fly, dynamically rewrites queries if confidence is low, and requests precise clarification from the user when documents do not contain the answer.

### ✨ Key Features

- 🔐 **Google OAuth Authentication** — Secure sign-in with Google, JWT session tokens.
- 📁 **Multi-Format Ingestion** — Upload and index PDFs (`.pdf`), Word Documents (`.docx`), Excel spreadsheets (`.xlsx`, `.xls`), PowerPoint presentations (`.pptx`), CSVs (`.csv`), and plain text files (`.txt`).
- 🤖 **LangGraph CRAG Agent Flow** — Corrective RAG workflow evaluating retrieval relevance using structured LLM schemas, performing query rewriting, or asking for clarification dynamically.
- 💬 **Real-time Chat via WebSocket** — Instant streaming-style Q&A over your documents with interactive clarification prompts.
- 🔍 **Semantic Vector Search** — Finds the most relevant passages using Gemini's 3072-dimensional embeddings via ChromaDB Cloud.
- 🔄 **Periodic Background Recovery** — Periodic background scheduler automatically retries indexing for failed documents and cleans up orphaned uploads.
- 🌙 **Dark / Light Theme** — Glassmorphism UI with smooth theme transitions.
- 🎨 **Premium UI** — Cal Sans typography, morphing blob backgrounds, and liquid glass effects.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                  Next.js 16 · React 19 · Tailwind v4            │
│         Google OAuth  ·  WebSocket Client  ·  Axios HTTP        │
└────────────────────┬──────────────────┬─────────────────────────┘
                     │ REST API         │ WebSocket
                     │ (HTTP)           │ (wss://)
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Uvicorn)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Auth Router  │  │ Chats Router │  │  WebSocket Router   │   │
│  │  /api/v1/auth │  │  /chats/*    │  │  /ws/chat/{id}      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘   │
│         │                 │                      │               │
│  ┌──────▼─────────────────▼──────────────────────▼──────────┐   │
│  │                Service Layer (LangGraph)                  │   │
│  │  ┌─────────────┐ ┌────────────────┐ ┌────────────────┐   │   │
│  │  │   Gemini    │ │ Data Ingestion │ │   ChromaDB     │   │   │
│  │  │ (LLM/Embed) │ │(Parsers+Split) │ │  (Vector DB)   │   │   │
│  │  └─────────────┘ └────────────────┘ └────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────┬──────────────────┬─────────────────────────────┘
                 │                  │
                 ▼                  ▼
    ┌────────────────────┐  ┌────────────────────┐
    │    PostgreSQL       │  │  ChromaDB Cloud    │
    │  (Aiven Cloud)      │  │  (Vector Store)    │
    │                     │  │                     │
    │  • Users            │  │  • Embeddings       │
    │  • Chats            │  │  • Document chunks  │
    │  • Messages         │  │  • Metadata         │
    │  • Documents        │  │                     │
    └────────────────────┘  └────────────────────┘
```

### 📡 LangGraph RAG Agent Workflow

AskDocs utilizes a self-reflective Corrective RAG (CRAG) pipeline modeled as a LangGraph state machine. It prevents hallucination and handles out-of-domain queries gracefully by routing questions dynamically based on a structured grading step.

```mermaid
graph TD
    START([Start]) --> Node_Embed[Embed User Query]
    Node_Embed --> Node_Retrieve[Retrieve document chunks from ChromaDB]
    Node_Retrieve --> Node_Grade[Grade Document Relevance]
    
    Node_Grade --> Cond_Route{Relevance & Confidence Grader}
    
    Cond_Route -- "Confidence >= 0.7\n& Chunks Relevant" --> Node_Generate[Generate Answer via Gemini]
    Cond_Route -- "Confidence < 0.7\n& First Attempt" --> Node_Rewrite[Rewrite Search Query]
    Cond_Route -- "No Relevant Chunks\nOR Max Attempts Reached" --> Node_Clarify[Ask User for Clarification]
    
    Node_Rewrite --> Node_Embed
    Node_Generate --> END([End])
    Node_Clarify --> END
```

1. **Embed User Query**: Generates a 3072-dimensional vector embedding of the user's question or rewritten search query.
2. **Retrieve**: Queries ChromaDB Cloud to fetch the top 5 most relevant document chunks matching the query vector.
3. **Document Grader**: Evaluates retrieved chunks against the query using a structured LLM schema (`GraderOutput`). Returns list of relevant indexes, confidence (0.0 to 1.0), and whether clarification is needed.
4. **Rewrite Query**: If the confidence is low ($< 0.7$), it automatically rewrites the search query to resolve ambiguous terms or pronouns using chat history context, looping back for another retrieval pass.
5. **Ask Clarification**: If the documents are irrelevant or insufficient after query rewrite, the grader suggests a custom clarification question detailing what is missing.
6. **Generate Answer**: The assistant answers the user's question, strictly grounded in the relevant documents context.

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework with App Router, SSR |
| **React 19** | UI rendering with hooks & client components |
| **TypeScript** | Type-safe frontend development |
| **Tailwind CSS v4** | Utility-first styling with custom design tokens |
| **next-themes** | Dark/light mode toggle with system preference |
| **@react-oauth/google** | Google OAuth 2.0 login flow |
| **Axios** | HTTP client for REST API calls |
| **Three.js** | 3D visual effects and animations |
| **Cal Sans** | Premium display typography |

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | Async Python web framework with auto-docs |
| **Uvicorn** | ASGI server for production deployment |
| **LangGraph** | Orchestration of the self-reflective agentic RAG graph |
| **LangChain** | Integrations, text splitting, and helper utilities |
| **Google Gemini API** | LLM inference (`gemini-2.5-flash`) and embeddings (`gemini-embedding-2`) |
| **ChromaDB Cloud** | Managed vector database for embedding storage & KNN search |
| **SQLAlchemy 2.0** | Async ORM with mapped column declarations |
| **asyncpg** | Async PostgreSQL driver |
| **Alembic** | Database schema migrations |
| **PyJWT** | JWT token encoding/decoding for auth |
| **File Parsers** | `PyMuPDF` (PDF), `docx2txt` (Word), `openpyxl` / `xlrd` (Excel), `python-pptx` (PowerPoint) |
| **Pydantic** | Request/response data validation and structured outputs |

---

## 🔌 APIs Used

| API | Model / Service | Usage |
|---|---|---|
| **Google Gemini** | `gemini-2.5-flash` | Answer generation, relevance grading, and search query rewriting |
| **Google Gemini** | `gemini-embedding-2` | Text-to-vector embeddings (3072 dimensions) |
| **Google OAuth 2.0** | Identity Platform | User authentication & token verification |
| **ChromaDB** | Cloud API | Vector storage, KNN similarity search |

---

## 📁 Project Structure

```
askdocs/
├── frontend/                    # Next.js 16 application
│   ├── app/
│   │   ├── components/
│   │   │   ├── ChatComponent.tsx     # Main chat interface (WebSocket logs, clarification renderer)
│   │   │   ├── ChatSidebar.tsx       # Chat history sidebar
│   │   │   ├── ChatMockup.tsx        # Landing page demo UI
│   │   │   ├── AssistantMessage.tsx   # AI response renderer (Markdown + citations)
│   │   │   ├── LoginButton.tsx        # Google OAuth button
│   │   │   ├── Navbar.tsx             # Navigation bar
│   │   │   └── ThemeProvider.tsx      # Dark/light mode provider
│   │   ├── globals.css               # Design system & glassmorphism
│   │   ├── layout.tsx                # Root layout with providers
│   │   └── page.tsx                  # Landing page / chat view
│   ├── lib/
│   │   ├── backend.ts               # Backend URL configuration
│   │   ├── allowed-documents.ts     # File type validation
│   │   └── parse-assistant-content.ts # Response parsing utilities
│   └── package.json
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py              # Google OAuth → JWT endpoint
│   │   │   ├── chats.py             # CRUD for chats & document upload
│   │   │   └── websocket.py         # Real-time RAG Q&A via WebSocket (runs LangGraph agent)
│   │   ├── services/
│   │   │   ├── LangGraph.py         # LangGraph state machine config (nodes, conditional routing, compile)
│   │   │   ├── GRADER_TEMPLATE.py   # Document relevance evaluation prompt template
│   │   │   ├── chromadb.py          # ChromaDB collection wrapper (add, search, delete)
│   │   │   ├── data_ingestion.py    # Document parsers, text splitting, & background runner
│   │   │   ├── generate_answer.py   # Gemini API prompt wrapper for grounded answer generation
│   │   │   ├── get_embeddings.py    # Wrapper for Google embedding models
│   │   │   └── rewrite_query.py     # LLM service to rewrite queries under low retrieval confidence
│   │   ├── db/
│   │   │   ├── database.py          # Async SQLAlchemy engine & session
│   │   │   └── models.py            # User, Chat, Message, Document tables
│   │   ├── models/
│   │   │   ├── embedded_data.py     # Pydantic schema for database embeddings
│   │   │   └── graph_state.py       # TypedDict schemas for LangGraph state tracker
│   │   ├── utils/
│   │   │   ├── chromadb.py          # ChromaDB CloudClient connection setup
│   │   │   ├── llm.py               # ChatGoogleGenerativeAI and embeddings clients setup
│   │   │   ├── load_pptx.py         # Utility to parse slides
│   │   │   ├── load_xls.py          # Utility to parse legacy Excel files
│   │   │   ├── load_xlsx.py         # Utility to parse modern Excel files
│   │   │   └── tavily_client.py     # Tavily search client utility
│   │   ├── dependencies.py          # JWT auth & user resolution
│   │   └── main.py                  # FastAPI app & background ingestion retry / cleanup loop
│   ├── alembic.ini                  # Migration configuration
│   └── pyproject.toml               # Python dependencies (managed via uv)
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** ≥ 3.11
- **Node.js** ≥ 18
- **uv** (Python package manager) — [install guide](https://docs.astral.sh/uv/)
- **PostgreSQL** database (or [Aiven](https://aiven.io/) cloud instance)
- **ChromaDB Cloud** account — [sign up](https://www.trychroma.com/)
- **Google Cloud** project with OAuth 2.0 credentials
- **Gemini API Key** — [get one](https://ai.google.dev/)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/askdocs.git
cd askdocs
```

### 2️⃣ Backend Setup

```bash
cd backend

# Create and activate virtual environment
uv venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows

# Install dependencies
uv sync
```

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_chroma_tenant_id
CHROMA_DATABASE=your_chroma_database_name
GOOGLE_CLIENT_ID=your_google_oauth_client_id
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname?ssl=require
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=your_langsmith_api_key
LANGSMITH_PROJECT="rag"
```

Run database migrations and start the server:

```bash
# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### 3️⃣ Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Start the development server:

```bash
npm run dev
```

The app will be available at **http://localhost:3000** 🎉

---

## 🗄️ Database Schema

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string name
        string google_id
    }
    CHATS {
        string id PK
        int user_id FK
        string title
        datetime created_at
    }
    DOCUMENTS {
        string id PK
        string document_name
        int user_id FK
        string chat_id FK
        bool is_embedded
        string status "pending | indexing | indexed | failed"
    }
    MESSAGES {
        string id PK
        string chat_id FK
        string role "user | assistant | document"
        text content
        bool is_clarification
        datetime created_at
    }

    USERS ||--o{ CHATS : "has many"
    USERS ||--o{ DOCUMENTS : "uploads"
    CHATS ||--o{ MESSAGES : "contains"
    CHATS ||--o{ DOCUMENTS : "references"
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/google` | Exchange Google OAuth token for JWT |

### Chats

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chats` | List all chats for authenticated user |
| `POST` | `/chats` | Create a new chat session |
| `DELETE` | `/chats/{chat_id}` | Delete a chat, its database messages, documents, and vector embeddings |
| `GET` | `/chats/{chat_id}/messages` | Retrieve chat message history with file ingestion statuses |
| `POST` | `/chats/{chat_id}/upload-doc` | Upload & enqueue PDF, DOCX, XLSX, XLS, PPTX, CSV, or TXT documents |

### WebSocket

| Protocol | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/chat/{chat_id}?token=JWT` | Real-time agentic Q&A via LangGraph engine |

---

## 🔒 Authentication & Communication Flow

```
1. User clicks "Sign in with Google"
2. Google OAuth returns an ID token
3. Frontend sends token to POST /api/v1/auth/google
4. Backend verifies token with Google's public keys
5. User is created/fetched from PostgreSQL
6. Backend returns a signed JWT
7. JWT is stored in localStorage for subsequent requests
8. WebSocket connections authenticate via query parameter
```

---

## 🧪 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for LLM, structured grading, & embeddings |
| `CHROMA_API_KEY` | ChromaDB Cloud API key |
| `CHROMA_TENANT` | ChromaDB tenant identifier |
| `CHROMA_DATABASE` | ChromaDB database name |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `DATABASE_URL` | PostgreSQL async connection string |
| `LANGSMITH_TRACING` | Set to `true` to enable LangSmith tracing for workflow observability |
| `LANGSMITH_ENDPOINT` | LangSmith API endpoint URL |
| `LANGSMITH_API_KEY` | LangSmith API key for authentication |
| `LANGSMITH_PROJECT` | LangSmith project name for trace grouping |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [Akem](https://github.com/your-username)**

*Powered by Google Gemini · LangGraph · LangChain · ChromaDB*

</div>
