import { useEffect, useState, useRef } from "react";
import api from "../services/api";

/**
 * Data model:
 * chat = {
 *   id: string,
 *   title: string,
 *   messages: [{ role: 'user'|'assistant', text: string, mermaid?:string, svg?:string, timestamp }],
 * }
 */

const STORAGE_KEY = "ai_architect_chats_v1";

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function useChatManager() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    // load from localStorage
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
      messages: []
    };
    setChats((s) => [newChat, ...s]);
    setActiveChatId(id);
  };

  const selectChat = (id) => setActiveChatId(id);

  const renameChat = (id, newTitle) => {
    setChats((s) => s.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const deleteChat = (id) => {
    setChats((s) => s.filter(c => c.id !== id));
    setActiveChatId((prev) => (prev === id ? (chats[0] ? chats[0].id : null) : prev));
  };

  const updateChat = (id, partial) => {
    setChats((s) => s.map(c => c.id === id ? { ...c, ...partial } : c));
  };

  const appendMessage = (id, message) => {
    setChats((s) => s.map(c => c.id === id ? { ...c, messages: [...c.messages, message] } : c));
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // sendMessage will:
  // 1) add user message
  // 2) build combined problem from this chat's messages
  // 3) call /api/ai/generate-mermaid => mermaid code
  // 4) call /api/mermaid/render => svg
  // 5) add assistant message with mermaid + svg
  const sendMessage = async (id, text) => {
    if (!id || !text) return;
    if (loadingRef.current) return; // basic throttle
    loadingRef.current = true;

    const userMsg = { role: "user", text, timestamp: Date.now() };
    appendMessage(id, userMsg);

    // prepare problem text by concatenating all user messages in this chat (first message is considered the "problem statement/title")
    const chat = chats.find(c => c.id === id);
    const userTexts = [...(chat?.messages || []).filter(m => m.role === "user").map(m => m.text), text];
    const problem = userTexts.join("\n\n");

    try {
      // Call backend to get mermaid code
      const genResp = await api.post("/api/ai/generate-mermaid", { problem });
      const mermaidCode = genResp.data.mermaid || genResp.data; // be flexible

      // Call backend to render SVG
      const renderResp = await api.post("/api/mermaid/render", { mermaidCode });
      const svg = renderResp.data.svg;

      const assistantMsg = {
        role: "assistant",
        text: mermaidCode,
        mermaid: mermaidCode,
        svg,
        timestamp: Date.now()
      };

      appendMessage(id, assistantMsg);

      // Optionally update chat title if empty: first user message as title
      const firstUser = userTexts.length ? userTexts[0] : null;
      if (firstUser) {
        renameChat(id, firstUser.length > 40 ? firstUser.slice(0, 40) + "..." : firstUser);
      }

    } catch (err) {
      console.error("sendMessage error", err);
      appendMessage(id, { role: "assistant", text: "Failed to generate diagram. See console.", timestamp: Date.now() });
    } finally {
      loadingRef.current = false;
    }
  };

  // exportPdf: use the first user message as 'problem' and latest svg from last assistant message
  const exportPdf = async (id) => {
    const chat = chats.find(c => c.id === id);
    if (!chat) return alert("No chat found.");
    const title = chat.title || "Architecture Diagram";
    const firstUser = chat.messages.find(m => m.role === "user")?.text || "";
    const latestAssistant = [...chat.messages].reverse().find(m => m.role === "assistant" && m.svg);
    const svg = latestAssistant?.svg;

    if (!svg) return alert("No diagram available to export. Generate one first.");

    try {
      const resp = await api.post("/api/pdf/export", { title, problem: firstUser, svg }, { responseType: "blob" });
      // download the blob
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^\w\s\-]/g, "_").slice(0,120)}.pdf`;
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
    exportPdf
  };
}
