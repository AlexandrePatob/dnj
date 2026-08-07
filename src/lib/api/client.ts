import { env } from "../env";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export type ApiErrorCode = "OFFLINE" | "TIMEOUT" | "NETWORK";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
    public readonly code?: ApiErrorCode,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("Sem conexão com a internet. Conecte-se e tente novamente.", 0, undefined, "OFFLINE");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const baseUrl = env.localHomologation ? "/api/v1" : env.apiUrl;
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const message = data?.message ?? data?.error?.message ?? "Não foi possível concluir a solicitação.";
      throw new ApiError(message, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("A API demorou para responder. Tente novamente.", 408, undefined, "TIMEOUT");
    }
    throw new ApiError("Não foi possível conectar à API.", 0, error, "NETWORK");
  } finally {
    window.clearTimeout(timeout);
  }
}
