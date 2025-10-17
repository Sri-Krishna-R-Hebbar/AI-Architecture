// src/App.jsx
import React, { useEffect, useState } from "react";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import { supabase } from "./lib/supabaseClient";
import axios from "axios";

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("loadChats error:", error);
      setChats([]);
    } else {
      setChats(data || []);
      // if none selected, don't auto-select; keep previous selection
      if (!activeChatId && data && data.length) {
        setActiveChatId(data[0].id);
        fetchMessagesForChat(data[0].id);
      }
    }
  }

  async function fetchMessagesForChat(chatId) {
    if (!chatId) {
      setMessages([]);
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("fetchMessagesForChat error:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }
  }

  const selectChat = async (chatId) => {
    setActiveChatId(chatId);
    await fetchMessagesForChat(chatId);
  };

  const createChat = async (title = "New Chat") => {
    const { data, error } = await supabase
      .from("chats")
      .insert([{ title }])
      .select()
      .single();
    if (error) {
      console.error("createChat error:", error);
      return;
    }
    setChats((prev) => [data, ...prev]);
    setActiveChatId(data.id);
    setMessages([]);
  };

  const deleteChat = async (chatId) => {
    // cascade deletes messages
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) console.error("deleteChat error:", error);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (chatId === activeChatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  const renameChat = async (chatId, newTitle) => {
    const { error } = await supabase.from("chats").update({ title: newTitle }).eq("id", chatId);
    if (error) {
      console.error("renameChat error:", error);
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c)));
  };

  // Helper: build conversation string using messages (pass as array) and new user message
  function buildConversation(messagesArr, newUserText) {
    const lines = [];
    // include last generated_title or similar isn't necessary here; we include previous assistant mermaid blocks
    for (const m of messagesArr) {
      if (m.role === "user") lines.push(`User: ${m.content}`);
      else if (m.role === "assistant") {
        if (m.mermaid) {
          lines.push(`Assistant previous_mermaid:\n${m.mermaid}`);
        } else if (m.content) {
          lines.push(`Assistant: ${m.content}`);
        }
      }
    }
    lines.push(`User: ${newUserText}`);
    return lines.join("\n\n");
  }

  // MAIN: sendMessage corrected
  const sendMessage = async (chatId, content) => {
    if (!chatId) return alert("No chat selected");

    // 1) Insert user message row
    const { data: userMsg, error: userErr } = await supabase
      .from("messages")
      .insert([{ chat_id: chatId, role: "user", content }])
      .select()
      .single();

    if (userErr) {
      console.error("Failed to save user message:", userErr);
      return;
    }

    // update local UI immediately
    setMessages((prev) => [...prev, userMsg]);

    // 2) Build conversation using messages (fetch latest from DB to be safe)
    const { data: existingMsgs, error: fetchErr } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (fetchErr) console.error("fetch existing messages error:", fetchErr);

    const convo = buildConversation(existingMsgs || [], content);

    try {
      // 3) Call backend to generate JSON (title, problem, tech_stack, mermaid)
      const aiResp = await axios.post(`${BACKEND}/api/ai/generate-mermaid`, { conversation: convo });
      const { title, problem, tech_stack, mermaid } = aiResp.data;

      // 4) Render mermaid -> svg
      const renderResp = await axios.post(`${BACKEND}/api/mermaid/render`, { mermaidCode: mermaid });
      const svg = renderResp.data.svg;

      // 5) Insert assistant message row with content (problem/title), mermaid, and svg
      const assistantPayload = {
        chat_id: chatId,
        role: "assistant",
        content: problem || title || "Generated result",
        mermaid,
        svg,
      };

      const { data: assistantMsg, error: assistantErr } = await supabase
        .from("messages")
        .insert([assistantPayload])
        .select()
        .single();

      if (assistantErr) {
        console.error("Failed to insert assistant message:", assistantErr);
      } else {
        setMessages((prev) => [...prev, assistantMsg]);
      }

      // 6) Update chat metadata (generated_title, generated_problem, generated_tech_stack)
      const { error: updateErr } = await supabase
        .from("chats")
        .update({
          generated_title: title,
          generated_problem: problem,
          generated_tech_stack: Array.isArray(tech_stack) ? tech_stack : tech_stack ? [tech_stack] : [],
        })
        .eq("id", chatId);

      if (updateErr) console.error("Failed to update chat metadata:", updateErr);

      // 7) refresh chat list so sidebar shows generated_title
      await loadChats();
    } catch (err) {
      console.error("AI generation/render error:", err);
      // save an assistant error row optionally
      await supabase.from("messages").insert([{ chat_id: chatId, role: "assistant", content: "Failed to generate diagram (see console)", mermaid: null, svg: null }]);
      // refresh messages
      fetchMessagesForChat(chatId);
    }
  };

  const exportPdf = async (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return alert("No chat found");
    const lastAssistant = [...messages].reverse().find((m) => m.svg);
    if (!lastAssistant) return alert("No diagram to export");

    try {
      const resp = await axios.post(
        `${BACKEND}/api/pdf/export`,
        {
          title: chat.generated_title || chat.title,
          problem: chat.generated_problem || chat.title,
          tech_stack: chat.generated_tech_stack || [],
          svg: lastAssistant.svg,
        },
        { responseType: "blob" }
      );

      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(chat.generated_title || chat.title).replace(/[^\w\s\-]/g, "_").slice(0, 120)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportPdf error:", err);
      alert("PDF export failed (see console)");
    }
  };

  return (
    <div className="app-root">
      <div className="app-container">
        <aside className="sidebar">
          <div className="brand">AI Architect</div>
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            onCreate={createChat}
            onSelect={selectChat}
            onRename={renameChat}
            onDelete={deleteChat}
          />
        </aside>

        <main className="main">
          {activeChatId ? (
            <ChatWindow
              chat={chats.find((c) => c.id === activeChatId)}
              messages={messages}
              onSend={(content) => sendMessage(activeChatId, content)}
              onExport={() => exportPdf(activeChatId)}
            />
          ) : (
            <div className="empty-state">Create a chat to get started</div>
          )}
        </main>
      </div>
    </div>
  );
}
