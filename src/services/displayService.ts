export interface DisplayQRResponse {
  raw_token: string;
  expires_at: string;
  error?: string;
}

export async function fetchCurrentDisplayQR(secret?: string): Promise<DisplayQRResponse> {
  const url = new URL("/api/display/qr", window.location.origin);
  if (secret) {
    url.searchParams.set("secret", secret);
  }

  const redactedPath = url.pathname + (secret ? "?secret=***" : "");
  console.log("[DisplayService] Fetch start:", redactedPath);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store",
      "Pragma": "no-cache",
    },
    credentials: "same-origin",
  });

  console.log("[DisplayService] HTTP status:", response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error || `خطأ في الاتصال (${response.status})`;
    console.error("[DisplayService] API error:", errorMsg);
    throw new Error(errorMsg);
  }

  const data: DisplayQRResponse = await response.json();
  console.log(
    "[DisplayService] Parsed OK — has raw_token:",
    !!data?.raw_token,
    ", expires_at:",
    data?.expires_at ?? "(missing)"
  );

  return data;
}
