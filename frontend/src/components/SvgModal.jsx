import React from "react";

export default function SvgModal({ svg, onClose }) {
  if (!svg) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1200,
        padding: 10,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          color: "#000",
          padding: 12,
          borderRadius: 8,
          width: "98%",
          height: "98%",
          overflow: "auto",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            background: "transparent",
            border: "none",
            fontSize: 24,
            fontWeight: "bold",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          ✕
        </button>

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
