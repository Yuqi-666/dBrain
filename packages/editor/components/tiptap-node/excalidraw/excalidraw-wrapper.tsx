"use client";

import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

export function ExcalidrawWrapper(props: {
  excalidrawAPI: (api: ExcalidrawImperativeAPI) => void;
  initialData: any;
}) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Excalidraw
        {...props}
      />
    </div>
  );
}
