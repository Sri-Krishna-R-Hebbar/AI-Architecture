import React, { useRef, useEffect, useState } from "react";
import DiagramPreview from "./DiagramPreview";

export default function ChatWindow({ chat, onSend, onExport, onUpdateChat }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef();

  useEffect(() => {
    // scroll to bottom on messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await onSend(input.trim());
    setInput("");
  };

  const lastAssistantSvg = [...chat.messages].reverse().find(m => m.role === "assistant" && m.svg)?.svg;

  return (
    <div className="chat-window">
      <header className="chat-header">
        <div className="chat-title">{chat.title}</div>
        <div className="chat-controls">
          <button className="btn" onClick={() => {
            const t = prompt("Edit chat title", chat.title);
            if (t !== null) onUpdateChat({ title: t });
          }}>Edit Title</button>
          <button className="btn primary" onClick={onExport}>Export PDF</button>
        </div>
      </header>

      <div className="messages-area">
        {chat.messages.map((m, idx) => (
          <div key={idx} className={`message ${m.role}`}>
            <div className="message-content">
              {m.role === "user" ? (
                <div className="user-text">{m.text}</div>
              ) : (
                <>
                  <div className="assistant-text">
                    <pre className="mermaid-code">{m.mermaid || m.text}</pre>
                  </div>
                  {m.svg ? <div className="svg-container" dangerouslySetInnerHTML={{ __html: m.svg }} /> : null}
                </>
              )}
            </div>
            <div className="message-meta">{new Date(m.timestamp).toLocaleString()}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the architecture or request a change..."
          rows={3}
        />
        <div className="input-actions">
          <button className="btn" onClick={() => { setInput(""); }}>Clear</button>
          <button className="btn primary" onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}
