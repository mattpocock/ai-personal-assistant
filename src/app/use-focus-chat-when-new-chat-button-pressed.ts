import { useEffect, useRef } from "react";

export const useFocusWhenNoChatIdPresent = (chatId: string | null) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!chatId) {
      ref.current?.focus();
    }
  }, [chatId]);

  return ref;
};
