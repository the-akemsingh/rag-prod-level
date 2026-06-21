import { getBackendUrl } from "@/lib/backend";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const backendUrl = getBackendUrl();
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incoming = await request.formData();
    const files = incoming.getAll("file");
    if (files.length === 0) {
      return Response.json({ error: "No document files provided." }, { status: 400 });
    }

    const outbound = new FormData();
    for (const file of files) {
      if (file instanceof File) {
        outbound.append("files", file);
      }
    }

    const response = await fetch(`${backendUrl}/chats/${chatId}/upload-doc`, {
      method: "POST",
      headers: { Authorization: authorization },
      body: outbound,
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return Response.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload proxy failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
