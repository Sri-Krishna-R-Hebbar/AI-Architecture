import { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "../lib/supabaseClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function nowIso() {
  return new Date().toISOString();
}

export default function useChatManager() {
  const [chats, setChats] = useState([]); // basic chat list (no messages)
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]); // messages for active chat
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  // Load chat list
  async function loadChats() {
    setLoadingChats(true);
    const { data, error } = await supabase
      .from("chats")
      .select("id, title, generated_title, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load chats:", error);
      setChats([]);
    } else {
      setChats(data || []);
      // if none selected, set first chat as active
      if (data && data.length && !activeChatId) {
        setActiveChatId((prev) => prev || data[0].id);
      }
    }
    setLoadingChats(false);
  }

  // Load messages for active chat whenever activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    fetchMessages(activeChatId);
  }, [activeChatId]);

  async function fetchMessages(chatId) {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, mermaid, svg, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }
    setLoadingMessages(false);
  }

  // Create chat (use passed title if present)
  async function createChat(title) {
    const chatTitle = title && title.trim() ? title.trim() : "New Chat";
    const { data, error } = await supabase
      .from("chats")
      .insert([{ title: chatTitle }])
      .select()
      .single();

    if (error) {
      console.error("Failed to create chat:", error);
      return null;
    }

    // Update local state & set active
    setChats((prev) => [data, ...prev]);
    setActiveChatId(data.id);
    // ensure messages cleared
    setMessages([]);
    return data;
  }

  // Select chat (UI click)
  async function selectChat(id) {
    setActiveChatId(id);
    // fetchMessages will run via effect
  }

  // Rename chat
  async function renameChat(id, newTitle) {
    const cleaned = newTitle && newTitle.trim() ? newTitle.trim() : "Untitled";
    const { error } = await supabase.from("chats").update({ title: cleaned }).eq("id", id);
    if (error) {
      console.error("Rename chat error:", error);
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: cleaned } : c)));
  }

  // Delete chat (cascade will remove messages)
  async function deleteChat(id) {
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) {
      console.error("Delete chat error:", error);
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
  }

  // Add message row to messages table
  async function addMessageRow(chatId, role, content = null, mermaid = null, svg = null) {
    const payload = {
      chat_id: chatId,
      role,
      content,
      mermaid,
      svg,
    };

    const { data, error } = await supabase.from("messages").insert([payload]).select().single();
    if (error) {
      console.error("addMessageRow error:", error);
      return null;
    }

    // update local messages if this chat is active
    if (chatId === activeChatId) {
      setMessages((prev) => [...prev, data]);
    }

    return data;
  }

  // Build conversation string for AI from messages + new user message
  function buildConversationText(chatMessages, latestUserText) {
    const lines = [];

    // include previous assistant mermaid blocks (so AI can edit)
    for (const m of chatMessages) {
      if (m.role === "user") lines.push(`User: ${m.content}`);
      else if (m.role === "assistant") {
        if (m.mermaid) {
          lines.push(`Assistant previous_mermaid:\n${m.mermaid}`);
        } else if (m.content) {
          lines.push(`Assistant: ${m.content}`);
        }
      }
    }

    lines.push(`User: ${latestUserText}`);
    return lines.join("\n\n");
  }

  // Send message: saves user message, calls backend, stores assistant result
  async function sendMessage(chatId, userText) {
    if (!chatId) return alert("No active chat selected.");
    // 1) save user message
    await addMessageRow(chatId, "user", userText, null, null);

    // 2) fetch the current messages for constructing conversation
    const { data: existingMessages, error: fetchErr } = await supabase
      .from("messages")
      .select("role, content, mermaid, svg, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (fetchErr) console.error("fetch messages before send:", fetchErr);

    // 3) build conversation for backend
    const conversation = buildConversationText(existingMessages || [], userText);

    // 4) call backend AI endpoint (uses conversation => returns JSON: title, problem, tech_stack, mermaid)
    try {
      const aiResp = await axios.post(`${BACKEND_URL}/api/ai/generate-mermaid`, {
        conversation,
      });

      const { title, problem, tech_stack, mermaid } = aiResp.data;

      // render mermaid -> svg by calling render endpoint
      const renderResp = await axios.post(`${BACKEND_URL}/api/mermaid/render`, { mermaidCode: mermaid });
      const svg = renderResp.data.svg;

      // 5) store assistant message row
      const assistantRow = await addMessageRow(chatId, "assistant", problem || title, mermaid, svg);

      // 6) update chat metadata (generated_title, generated_problem, generated_tech_stack)
      const { error: updateErr } = await supabase.from("chats").update({
        generated_title: title,
        generated_problem: problem,
        generated_tech_stack: Array.isArray(tech_stack) ? tech_stack : (tech_stack ? [tech_stack] : []),
      }).eq("id", chatId);

      if (updateErr) console.error("Failed updating chat meta:", updateErr);

      // refresh chat list to show new generated_title
      await loadChats();

      return assistantRow;
    } catch (err) {
      console.error("sendMessage AI error:", err);
      return null;
    }
  }

  // Export PDF: use stored generated values plus last assistant svg
  async function exportPdf(chatId) {
    // get chat meta
    const { data: chatRows, error: chatErr } = await supabase.from("chats").select("*").eq("id", chatId).single();
    if (chatErr) {
      console.error("exportPdf: failed to fetch chat", chatErr);
      return;
    }
    // get last assistant svg
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("svg, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (msgErr) console.error("exportPdf messages fetch err:", msgErr);

    const lastSvgObj = (msgs || []).reverse().find((m) => m.svg);
    if (!lastSvgObj) return alert("No SVG found to export.");

    const payload = {
      title: chatRows.generated_title || chatRows.title || "Architecture Diagram",
      problem: chatRows.generated_problem || chatRows.title || "",
      tech_stack: chatRows.generated_tech_stack || [],
      svg: lastSvgObj.svg,
    };

    try {
      const resp = await axios.post(`${BACKEND_URL}/api/pdf/export`, payload, { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payload.title.replace(/[^\w\s\-]/g, "_").slice(0, 120)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportPdf error:", err);
      alert("Failed to export PDF. See console.");
    }
  }

  // Return values & functions
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    loadingChats,
    loadingMessages,
    createChat,
    selectChat,
    renameChat,
    deleteChat,
    sendMessage,
    exportPdf,
  };
}
