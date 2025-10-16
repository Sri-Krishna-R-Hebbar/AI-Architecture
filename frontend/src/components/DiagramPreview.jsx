import React from "react";

export default function DiagramPreview({ svg }) {
  if (!svg) return <div className="muted">No diagram yet</div>;
  return <div className="diagram-preview" dangerouslySetInnerHTML={{ __html: svg }} />;
}
