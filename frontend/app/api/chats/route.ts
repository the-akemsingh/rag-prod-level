import { getBackendUrl } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const backendUrl = getBackendUrl();
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendUrl}/chats`, {
      method: "POST",
      headers: { Authorization: authorization },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return Response.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create chat.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const backendUrl = getBackendUrl();
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendUrl}/chats`, {
      headers: { Authorization: authorization },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : [];
    return Response.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch chats.";
    return Response.json({ error: message }, { status: 500 });
  }
}
