from services.llm_call import getEmbeddings, generateAnswer
from services.chromadb import search_embeddings

from services.GRADER_TEMPLATE import GRADER_TEMPLATE
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph
from langgraph.graph import START, END

from typing_extensions import TypedDict
from pydantic import BaseModel
from typing import cast, NotRequired
import os
from dotenv import load_dotenv

load_dotenv()


class Metadata(TypedDict):
    # page_label: str    #not every doc type has these fields - that's what i noticed in chromadb - I COULD BE WRONG
    # page: int
    # total_pages: int
    source: str


class Doc(TypedDict):
    content: str
    score: float
    metadata: Metadata


class GraphState(TypedDict):
    userMessage: str
    document_ids: list[str]
    chat_history: NotRequired[list[dict[str, str]]]
    query_vector: NotRequired[list[float]]
    retrieved_docs: NotRequired[list[Doc]]
    relevant_docs: NotRequired[list[Doc]]
    llmResponse: NotRequired[str]
    retrieval_attempts: NotRequired[int]


class GraderOutput(BaseModel):
    relevant_indexes: list[int]


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", api_key=os.getenv("GEMINI_API_KEY")
)
grade_prompt = ChatPromptTemplate.from_template(GRADER_TEMPLATE)
structured_llm = llm.with_structured_output(GraderOutput)
docGrader = grade_prompt | structured_llm


# graph nodes
async def embed_user_message(state: GraphState):
    embeddings = await getEmbeddings([state["userMessage"]])

    if not embeddings or not embeddings[0].values:
        return {"query_vector": []}

    return {"query_vector": embeddings[0].values}


async def retrieve(state: GraphState):
    query_vector = state.get("query_vector")
    if not query_vector:
        return {"retrieved_docs": []}

    search_result = await search_embeddings(query_vector, state["document_ids"])

    if not search_result["documents"] or not search_result["documents"][0]:
        return {"retrieved_docs": []}

    retrieved_docs = search_result["documents"][0]
    retrieved_docs_score = search_result["scores"][0]
    retrieved_docs_metadata = search_result["metadatas"][0]

    return {
        "retrieved_docs": [
            {"content": doc, "score": score, "metadata": metadata}
            for doc, score, metadata in zip(
                retrieved_docs, retrieved_docs_score, retrieved_docs_metadata
            )
        ]
    }


async def document_grader(state: GraphState):
    retrieved_docs = state.get("retrieved_docs")
    if not retrieved_docs:
        return {"relevant_docs": []}

    relevantDocs = []
    context_parts = []

    for idx, doc in enumerate(retrieved_docs):
        context_parts.append(
            f"""
            Document Index: {idx},\n 
            Document Content: {doc["content"]}, \n 
            Document Metadata: \n
            Source: {doc["metadata"]["source"]}
            """
        )

    context = "\n ================================ \n".join(context_parts)

    graderReponse = cast(
        GraderOutput,
        await docGrader.ainvoke({"question": state["userMessage"], "content": context}),
    )
    
    if graderReponse.relevant_indexes:
        for index in graderReponse.relevant_indexes:
            idx = int(index)
            if 0 <= idx < len(retrieved_docs):
                relevantDocs.append(retrieved_docs[idx])

    return {"relevant_docs": relevantDocs}


async def generate_llm_response(state: GraphState):
    relevant_docs = state.get("relevant_docs")
    
    if not relevant_docs:
        return {
            "llmResponse": "Sorry, I don't have enough information in the provided documents to answer that question."
        }
        
    chat_history = state.get("chat_history", [])
    history_lines = []

    for item in chat_history:
        role = item.get("role", "unknown")
        if role == "document":
            document_name = item.get("document_name", item.get("content", ""))
            history_lines.append(f"document: {document_name}")
        else:
            history_lines.append(f"{role}: {item.get('content', '')}")

    history_context = "\n".join(history_lines)
    documents_context = "\n\n".join([doc["content"] for doc in relevant_docs])
    
    context = f"Conversation History:\n{history_context}\n\nRelevant Documents:\n{documents_context}"

    answer = await generateAnswer(context, state["userMessage"])
    return {"llmResponse": answer}


#  conditional edge nodes


def route_after_grading(state: GraphState):
    return "generate_llm_response"

# def enhance_user_query(state:GraphState):
#     user_query = state.get("userMessage")
#     return user_query
    

#  workflow
agent_builder = StateGraph(GraphState)

agent_builder.add_edge(START, "embed_user_message")
agent_builder.add_node("embed_user_message", embed_user_message)
agent_builder.add_node("retrieve", retrieve)
agent_builder.add_node("document_grader", document_grader)
agent_builder.add_node("generate_llm_response", generate_llm_response)


agent_builder.add_edge(start_key="embed_user_message", end_key="retrieve")
agent_builder.add_edge(start_key="retrieve", end_key="document_grader")
agent_builder.add_conditional_edges(
    "document_grader",
    route_after_grading,
    {
        "generate_llm_response": "generate_llm_response",
        END: END,
    },
)
agent_builder.add_edge("generate_llm_response", END)

agent = agent_builder.compile()
