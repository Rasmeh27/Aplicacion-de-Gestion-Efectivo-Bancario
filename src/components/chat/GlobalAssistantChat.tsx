import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { recommendationsApi, sucursalesApi } from "../../services/api";
import type { ChatMessage, Sucursal } from "../../types";

const STORAGE_KEY = "banking-ai-chat-history";
const QUICK_PROMPTS = [
  "¿Qué sucursal requiere atención inmediata?",
  "Resume las alertas activas del sistema.",
  "¿Dónde hay riesgo operativo por efectivo?",
  "¿Qué tendencia debería monitorear hoy?",
];

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hola. Puedo responder consultas rápidas sobre efectivo, alertas, tendencias y recomendaciones operativas usando el contexto actual del sistema.",
  timestamp: new Date(),
};

export default function GlobalAssistantChat() {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Sucursal[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sucursalesApi.list().then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages.map((message) => ({ ...message, timestamp: message.timestamp.toISOString() })))
    );
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, open]);

  const branchName = useMemo(
    () => branches.find((branch) => branch.id === selectedBranch)?.nombre ?? "Contexto general",
    [branches, selectedBranch]
  );

  const sendMessage = async (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || sending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    setError("");

    try {
      const response = await recommendationsApi.chat({
        message,
        sucursalId: selectedBranch || undefined,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply ?? response.answer ?? "No se recibió contenido en la respuesta.",
          timestamp: new Date(),
        },
      ]);
    } catch (err: unknown) {
      setError(readError(err, "No fue posible completar la consulta."));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "No pude responder esa consulta ahora mismo. Verifica los permisos del módulo de recomendaciones o la disponibilidad del modelo en el backend.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    const reset = [{ ...WELCOME_MESSAGE, timestamp: new Date() }];
    setMessages(reset);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(reset.map((message) => ({ ...message, timestamp: message.timestamp.toISOString() })))
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-[440px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <Sparkles className="h-4 w-4" />
                  Asistente operativo
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Consultas rápidas</h2>
                <p className="mt-1 text-sm text-slate-500">Responde con el contexto consolidado del sistema.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                <option value="">Contexto general</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearChat}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-4 py-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
              Contexto activo: <span className="font-semibold text-slate-700">{branchName}</span>
            </div>

            {messages.map((message, index) => (
              <div
                key={`${message.timestamp.toISOString()}-${index}`}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === "assistant"
                      ? "border border-slate-200 bg-white text-slate-700"
                      : "bg-slate-800 text-white"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                    {message.role === "assistant" ? (
                      <>
                        <Bot className="h-4 w-4" />
                        Asistente
                      </>
                    ) : (
                      <>Tú</>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  <p className={`mt-2 text-[11px] ${message.role === "assistant" ? "text-slate-400" : "text-slate-300"}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando respuesta...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4">
            {messages.length <= 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={sending}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-end gap-3">
              <textarea
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Escribe una consulta operativa..."
                className="min-h-[84px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sending || input.trim().length === 0}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-slate-900"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">Asistente IA</span>
      </button>
    </>
  );
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [{ ...WELCOME_MESSAGE, timestamp: new Date() }];

    const parsed = JSON.parse(raw) as Array<{
      role: ChatMessage["role"];
      content: string;
      timestamp: string;
    }>;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [{ ...WELCOME_MESSAGE, timestamp: new Date() }];
    }

    return parsed.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    }));
  } catch {
    return [{ ...WELCOME_MESSAGE, timestamp: new Date() }];
  }
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readError(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = (error.response as { data?: { error?: { message?: string } } }).data;
    return data?.error?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}