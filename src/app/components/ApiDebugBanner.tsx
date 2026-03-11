import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { apiErrorDebugStore, type ApiDebugErrorRecord } from "../services/apiErrorDebug";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function truncateBody(body: string): string {
  if (body.length <= 300) {
    return body;
  }

  return `${body.slice(0, 300)}...`;
}

export function ApiDebugBanner() {
  const [errorRecord, setErrorRecord] = useState<ApiDebugErrorRecord | null>(apiErrorDebugStore.getLatest());
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    return apiErrorDebugStore.subscribe((nextRecord) => {
      setErrorRecord(nextRecord);
      if (nextRecord) {
        setDismissedId(null);
      }
    });
  }, []);

  const visibleRecord = useMemo(() => {
    if (!errorRecord) {
      return null;
    }
    if (dismissedId === errorRecord.id) {
      return null;
    }
    return errorRecord;
  }, [dismissedId, errorRecord]);

  if (!visibleRecord) {
    return null;
  }

  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        margin: "10px 16px 0",
        borderRadius: 8,
        border: "1px solid rgba(185, 28, 28, 0.25)",
        background: "rgba(185, 28, 28, 0.08)",
        color: "#7F1D1D",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <AlertTriangle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
            API Error {visibleRecord.status} {visibleRecord.statusText}
            {visibleRecord.code ? ` (${visibleRecord.code})` : ""}
          </div>
          <div style={{ fontSize: 12, marginTop: 2, lineHeight: 1.35 }}>{visibleRecord.message}</div>
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.9 }}>
            {visibleRecord.method} {visibleRecord.url} at {formatTimestamp(visibleRecord.timestamp)}
          </div>
          {visibleRecord.body && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Response body</summary>
              <pre
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 140,
                  overflowY: "auto",
                  background: "rgba(255,255,255,0.45)",
                  padding: "6px 8px",
                  borderRadius: 6,
                }}
              >
                {truncateBody(visibleRecord.body)}
              </pre>
            </details>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss API debug banner"
          onClick={() => setDismissedId(visibleRecord.id)}
          style={{
            border: "none",
            background: "transparent",
            color: "#7F1D1D",
            cursor: "pointer",
            padding: 0,
            minHeight: 24,
            minWidth: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
    </section>
  );
}
