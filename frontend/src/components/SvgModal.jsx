import React from "react";

export default function SvgModal({ svg, onClose }) {
  if (!svg) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1200,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          color: "#000",
          padding: 12,
          borderRadius: 8,
          maxWidth: "95%",
          maxHeight: "95%",
          overflow: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            background: "transparent",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  );
}
