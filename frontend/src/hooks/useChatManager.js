import { useEffect, useState, useRef } from "react";
import api from "../services/api";

/**
 * Chat schema:
 * {
 *   id,
 *   title, // local title (not used for PDF title anymore)
 *   generatedTitle,      // last generated title from OpenAI
 *   generatedProblem,    // last generated problem from OpenAI
 *   generatedTechStack,  // last generated tech stack from OpenAI (array)
 *   messages: [{ role, text, mermaid?, svg?, timestamp }]
 * }
 */

const STORAGE_KEY = "ai_architect_chats_v2";

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function useChatManager() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setChats(parsed);
        if (parsed.length) setActiveChatId(parsed[0].id);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  const createChat = (title = null) => {
    const id = makeId();
    const newChat = {
      id,
      title: title || `Untitled ${chats.length + 1}`,
      generatedTitle: null,
      generatedProblem: null,
      generatedTechStack: [],
      messages: [],
    };
    setChats((s) => [newChat, ...s]);
    setActiveChatId(id);
  };

  const selectChat = (id) => setActiveChatId(id);

  const renameChat = (id, newTitle) =>
    setChats((s) => s.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));

  const deleteChat = (id) => {
    setChats((s) => s.filter((c) => c.id !== id));
    setActiveChatId((prev) => (prev === id ? (chats[0] ? chats[0].id : null) : prev));
  };

  const updateChat = (id, partial) =>
    setChats((s) => s.map((c) => (c.id === id ? { ...c, ...partial } : c)));

  const appendMessage = (id, message) => {
    setChats((s) => s.map((c) => (c.id === id ? { ...c, messages: [...c.messages, message] } : c)));
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Build a conversation string that includes all user messages and latest assistant mermaid code
  function buildConversationTextForChat(chat, latestUserText) {
    // include chronology: previous user messages -> assistant mermaid code (labelled) -> latest user text
    const lines = [];

    // include chat context: existing generated problem if any
    if (chat.generatedTitle) {
      lines.push(`Existing Title: ${chat.generatedTitle}`);
    }
    if (chat.generatedProblem) {
      lines.push(`Existing Problem: ${chat.generatedProblem}`);
    }

    // include prior messages
    for (const m of chat.messages) {
      if (m.role === "user") {
        lines.push(`User: ${m.text}`);
      } else if (m.role === "assistant") {
        // include the last mermaid code block the assistant generated (if exists)
        if (m.mermaid) {
          lines.push(`Assistant (previous_mermaid):\n${m.mermaid}`);
        }
      }
    }

    // finally include the new user message asking for changes or fresh request
    lines.push(`User: ${latestUserText}`);

    return lines.join("\n\n");
  }

  // sendMessage:
  const sendMessage = async (id, text) => {
    if (!id || !text) return;
    if (loadingRef.current) return;
    loadingRef.current = true;

    const userMsg = { role: "user", text, timestamp: Date.now() };
    appendMessage(id, userMsg);

    const chat = chats.find((c) => c.id === id);
    if (!chat) {
      loadingRef.current = false;
      return;
    }

    // build conversation including previous assistant mermaid code
    const conversation = buildConversationTextForChat(chat, text);

    try {
      // Call backend /api/ai/generate-mermaid with conversation
      const genResp = await api.post("/api/ai/generate-mermaid", { conversation });
      const payload = genResp.data;

      // expected payload: { title, problem, tech_stack, mermaid }
      const { title, problem, tech_stack, mermaid } = payload;

      // render mermaid to svg
      const renderResp = await api.post("/api/mermaid/render", { mermaidCode: mermaid });
      const svg = renderResp.data.svg;

      // assistant message to append
      const assistantMsg = {
        role: "assistant",
        text: mermaid,
        mermaid,
        svg,
        timestamp: Date.now(),
      };

      // update chat fields: store generated title/problem/tech
      setChats((s) =>
        s.map((c) =>
          c.id === id
            ? {
                ...c,
                generatedTitle: title,
                generatedProblem: problem,
                generatedTechStack: Array.isArray(tech_stack) ? tech_stack : [],
                messages: [...c.messages, assistantMsg],
              }
            : c
        )
      );
    } catch (err) {
      console.error("sendMessage error", err);
      appendMessage(id, { role: "assistant", text: "Failed to generate diagram. See console.", timestamp: Date.now() });
    } finally {
      loadingRef.current = false;
    }
  };

  // exportPdf uses generatedTitle/generatedProblem/generatedTechStack and latest svg
  const exportPdf = async (id) => {
    const chat = chats.find((c) => c.id === id);
    if (!chat) return alert("No chat found.");

    const title = chat.generatedTitle || chat.title || "Architecture Diagram";
    const problem = chat.generatedProblem || chat.messages.find((m) => m.role === "user")?.text || "";
    const tech_stack = chat.generatedTechStack || [];

    const latestAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.svg);
    const svg = latestAssistant?.svg;
    if (!svg) return alert("No diagram available to export. Generate one first.");

    try {
      const resp = await api.post("/api/pdf/export", { title, problem, svg, tech_stack }, { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "diagram").replace(/[^\w\s\-]/g, "_").slice(0, 120)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportPdf error", err);
      alert("PDF export failed. See console.");
    }
  };

  return {
    chats,
    activeChatId,
    activeChat,
    createChat,
    selectChat,
    renameChat,
    deleteChat,
    updateChat,
    sendMessage,
    exportPdf,
  };
}
