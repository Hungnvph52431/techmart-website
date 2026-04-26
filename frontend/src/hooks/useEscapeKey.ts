import { useEffect } from "react";

/**
 * Gọi callback khi user bấm ESC. Dùng cho modal/dialog.
 */
export const useEscapeKey = (onEscape: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
};
