import React, { useState } from "react";

export default function ChatList({
  chats,
  activeChatId,
  onCreate,
  onSelect,
  onRename,
  onDelete,
}) {
  const [newTitle, setNewTitle] = useState("");

  return (
    <div className="chatlist">
      <div className="chatlist-actions">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New chat title (optional)"
          className="input"
        />
        <button
          className="btn primary"
          onClick={() => {
            onCreate(newTitle || undefined);
            setNewTitle("");
          }}
        >
          + New Chat
        </button>
      </div>

      <div className="chat-items">
        {chats.length === 0 && <div className="muted">No chats yet</div>}
        {chats.map((c) => (
          <div
            key={c.id}
            className={`chat-item ${c.id === activeChatId ? "active" : ""}`}
          >
            <div className="chat-title" onClick={() => onSelect(c.id)}>
              {c.title}
            </div>
            <div className="chat-actions">
              <button
                className="btn small"
                onClick={() => {
                  const newT = prompt("Rename chat", c.title);
                  if (newT !== null) onRename(c.id, newT);
                }}
              >
                Rename
              </button>
              <button
                className="btn small danger"
                onClick={() => {
                  if (confirm("Delete chat?")) onDelete(c.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        Tip: first message will help auto-title the chat.
      </div>
    </div>
  );
}
