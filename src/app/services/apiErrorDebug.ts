export interface ApiDebugErrorRecord {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  code: string | null;
  message: string;
  body: string;
}

export class ApiRequestError extends Error {
  details: ApiDebugErrorRecord;

  constructor(message: string, details: ApiDebugErrorRecord) {
    super(message);
    this.name = "ApiRequestError";
    this.details = details;
  }
}

type Listener = (record: ApiDebugErrorRecord | null) => void;

const listeners = new Set<Listener>();
let latestError: ApiDebugErrorRecord | null = null;
let nextErrorId = 1;

function emit(record: ApiDebugErrorRecord | null) {
  latestError = record;
  for (const listener of listeners) {
    listener(record);
  }
}

function toBodyString(payload: unknown, fallbackText: string): string {
  if (fallbackText.trim().length > 0) {
    return fallbackText;
  }

  if (payload === undefined || payload === null) {
    return "";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function getBackendCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const map = payload as Record<string, unknown>;
  const candidate = map.code ?? map.errorCode ?? map.error;
  return typeof candidate === "string" ? candidate : null;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const map = payload as Record<string, unknown>;
  if (typeof map.message === "string" && map.message.trim().length > 0) {
    return map.message;
  }

  if (typeof map.error === "string" && map.error.trim().length > 0) {
    return map.error;
  }

  return fallback;
}

function createRecord(input: {
  method: string;
  url: string;
  status: number;
  statusText: string;
  payload?: unknown;
  bodyText?: string;
  fallbackMessage: string;
}): ApiDebugErrorRecord {
  const body = toBodyString(input.payload, input.bodyText ?? "");
  return {
    id: nextErrorId++,
    timestamp: new Date().toISOString(),
    method: input.method,
    url: input.url,
    status: input.status,
    statusText: input.statusText,
    code: getBackendCode(input.payload),
    message: getErrorMessage(input.payload, input.fallbackMessage),
    body,
  };
}

export const apiErrorDebugStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getLatest() {
    return latestError;
  },
  clear() {
    emit(null);
  },
  recordResponseError(input: {
    method: string;
    url: string;
    status: number;
    statusText: string;
    payload?: unknown;
    bodyText?: string;
    fallbackMessage?: string;
  }): ApiDebugErrorRecord {
    const record = createRecord({
      ...input,
      fallbackMessage: input.fallbackMessage ?? `Request failed with status ${input.status}.`,
    });
    emit(record);
    return record;
  },
  recordNetworkError(input: {
    method: string;
    url: string;
    message: string;
    error: unknown;
  }): ApiDebugErrorRecord {
    const errorBody =
      input.error instanceof Error
        ? input.error.message
        : typeof input.error === "string"
          ? input.error
          : "Unknown network error";

    const record = createRecord({
      method: input.method,
      url: input.url,
      status: 0,
      statusText: "NETWORK_ERROR",
      payload: { code: "NETWORK_ERROR", message: input.message, cause: errorBody },
      bodyText: errorBody,
      fallbackMessage: input.message,
    });

    emit(record);
    return record;
  },
};

export async function parseJsonResponse<T>(response: Response, method: string, url: string): Promise<T> {
  const bodyText = await response.text();
  let payload: unknown = {};

  if (bodyText.trim().length > 0) {
    try {
      payload = JSON.parse(bodyText);
    } catch {
      payload = { raw: bodyText };
    }
  }

  if (!response.ok) {
    const record = apiErrorDebugStore.recordResponseError({
      method,
      url,
      status: response.status,
      statusText: response.statusText,
      payload,
      bodyText,
      fallbackMessage: "Request failed.",
    });
    throw new ApiRequestError(record.message, record);
  }

  return payload as T;
}
