import { getBackendUrl } from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const backendUrl = getBackendUrl();
    const body = await request.json();

    const response = await fetch(`${backendUrl}/api/v1/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return Response.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
