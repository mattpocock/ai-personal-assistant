import type { UIMessage } from "ai";

export function createUIMessageFixture<TMessage extends UIMessage>(
  input: string[]
): TMessage[];
export function createUIMessageFixture<TMessage extends UIMessage>(
  ...input: string[]
): TMessage[];
export function createUIMessageFixture<TMessage extends UIMessage>(
  ...input: (string | string[])[]
): TMessage[] {
  return input.flat().map((message, index): TMessage => {
    return {
      id: String(index + 1),
      role: index % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: message }],
    } as TMessage;
  });
}
