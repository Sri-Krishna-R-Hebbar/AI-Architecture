import React from "react";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import useChatManager from "./hooks/useChatManager";

/**
 * Layout:
 * - Left column: ChatList (create/select chats)
 * - Right column: ChatWindow (messages, diagram preview, export button)
 */
export default function App() {
  const chatManager = useChatManager();

  return (
    <div className="app-root">
      <div className="app-container">
        <aside className="sidebar">
          <div className="brand">AI Architect</div>
          <ChatList
            chats={chatManager.chats}
            activeChatId={chatManager.activeChatId}
            onCreate={chatManager.createChat}
            onSelect={chatManager.selectChat}
            onRename={chatManager.renameChat}
            onDelete={chatManager.deleteChat}
          />
        </aside>

        <main className="main">
          {chatManager.activeChat ? (
            <ChatWindow
              chat={chatManager.activeChat}
              onSend={(text) => chatManager.sendMessage(chatManager.activeChatId, text)}
              onExport={() => chatManager.exportPdf(chatManager.activeChatId)}
              onUpdateChat={(updated) => chatManager.updateChat(chatManager.activeChatId, updated)}
            />
          ) : (
            <div className="empty-state">Create a chat to get started</div>
          )}
        </main>
      </div>
    </div>
  );
}
