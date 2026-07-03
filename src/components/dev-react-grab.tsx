"use client";

import { useEffect } from "react";

/** Dev-only: load react-grab without rendering a <script> tag through React. */
export function DevReactGrab() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/react-grab/dist/index.global.js";
    script.crossOrigin = "anonymous";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
