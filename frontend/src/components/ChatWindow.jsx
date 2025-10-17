import React, { useRef, useEffect, useState } from "react";
import DiagramPreview from "./DiagramPreview";
import SvgModal from "./SvgModal";

export default function ChatWindow({ chat, onSend, onExport, onUpdateChat }) {
  const [input, setInput] = useState("");
  const [modalSvg, setModalSvg] = useState(null);
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await onSend(input.trim());
    setInput("");
  };

  const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.svg);
  const lastSvg = lastAssistant?.svg;

  return (
    <div className="chat-window">
      <header className="chat-header">
        <div>
          <div className="chat-title">{chat.generatedTitle || chat.title}</div>
          {chat.generatedTechStack && chat.generatedTechStack.length > 0 && (
            <div className="muted" style={{ fontSize: 12 }}>
              Tech: {chat.generatedTechStack.join(", ")}
            </div>
          )}
        </div>

        <div className="chat-controls">
          <button
            className="btn"
            onClick={() => {
              const t = prompt("Edit chat title (local only)", chat.title);
              if (t !== null) onUpdateChat({ title: t });
            }}
          >
            Edit Title
          </button>
          <button className="btn primary" onClick={onExport}>
            Export PDF
          </button>
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
                  {m.svg ? (
                    <div
                      className="svg-container"
                      onClick={() => setModalSvg(m.svg)}
                      style={{ cursor: "zoom-in" }}
                      dangerouslySetInnerHTML={{ __html: m.svg }}
                    />
                  ) : null}
                </>
              )}
            </div>
            <div className="message-meta">{new Date(m.timestamp).toLocaleString()}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe the architecture or request a change..." rows={3} />
        <div className="input-actions">
          <button className="btn" onClick={() => setInput("")}>
            Clear
          </button>
          <button className="btn primary" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>

      <SvgModal svg={modalSvg} onClose={() => setModalSvg(null)} />
    </div>
  );
}
