import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def getChatResponse(userInput: str):
    return client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=userInput
    )

def getEmbeddings(content: list[str]):
    embeddings = []
    for text in content:
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text
        )
        if response.embeddings:
            embeddings.append(response.embeddings[0])
    return embeddings

async def generateAnswer(context: str, question: str):
    prompt = f"""
You are an RAG application name raggy developed by akem.

Answer the question using ONLY the provided context.

If the answer is not present in the context, say:
"Sorry, I don't know the answer."

Context:
{context}

Question:
{question}
"""
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt
    )
    return response.text