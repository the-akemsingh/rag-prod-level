import { getBackendUrl } from "@/lib/backend";

export async function DELETE(
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

    const response = await fetch(`${backendUrl}/chats/${chatId}`, {
      method: "DELETE",
      headers: { Authorization: authorization },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return Response.json(body, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete proxy failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
