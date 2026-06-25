import os
from google import genai
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


groqClient = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1"
)

# response = client.chat.completions.create(
#     model="llama-3.3-70b-versatile",
#     messages=[
#         {"role": "user", "content": prompt}
#     ]
# )


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def getChatResponse(userInput: str):
    return client.models.generate_content(
        model="gemini-2.5-flash-lite", contents=userInput
    )


async def getEmbeddings(content: list[str]):
    embeddings = []
    for text in content:
        response = client.models.embed_content(
            model="gemini-embedding-2", contents=text
        )
        if response.embeddings:
            embeddings.append(response.embeddings[0])
    return embeddings


async def generateAnswer(context: str, question: str):
    prompt = f"""You are **Raggy**, an intelligent and helpful AI assistant built by Akem. \
You answer user questions strictly based on the retrieved context provided below.

## Instructions
1. **Ground every claim in the context.** Only use information explicitly stated in the provided context. Do NOT use prior knowledge or make assumptions beyond what the context contains.
2. **Be concise yet thorough.** Provide a clear, well-structured answer. Use bullet points or numbered lists when the answer involves multiple items or steps.
3. **Quote or paraphrase the context** when it strengthens your answer, so the user can trace the information back to the source material.
4. **If the context only partially answers the question**, answer what you can and clearly state which parts of the question are not covered by the available context.
5. **If the context does not contain the answer at all**, respond exactly with:
   "Sorry, I don't have enough information in the provided documents to answer that question."
6. **Never fabricate, guess, or hallucinate information.** Accuracy is more important than completeness.
7. **Use a friendly, professional tone.** Write in clear, accessible language.

---

### Context
{context}

---

### User Question
{question}
"""
    response = groqClient.chat.completions.create(
        model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


async def enhanceUserQuery(context: str, question: str):
    prompt = f"""
You are an expert query rewriter for a Retrieval-Augmented Generation (RAG) system.

Your task is to rewrite the user's question so it retrieves the most relevant documents from a vector database.

Rules:
1. Preserve the original intent exactly. Do NOT change what the user is asking.
2. Expand ambiguous words into more specific technical terms when appropriate.
3. Replace pronouns like "it", "this", "they", etc., with explicit entities if they can be inferred from the question.
4. Include important synonyms or related terminology that may appear in documents.
5. Keep the rewritten query concise (one sentence).
6. Do NOT answer the question.
7. Do NOT add information that is not implied by the user's question.
8. Return ONLY the rewritten query.

Context:
{context}

User Question:
{question}
"""
    response = groqClient.chat.completions.create(
        model="llama-3.3-70b-versatile", messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
