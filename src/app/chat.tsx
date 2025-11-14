"use client";

import { Action, Actions } from "@/components/ai-elements/actions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/ai-elements/tool";
import { DB } from "@/lib/persistence-layer";
import { useChat } from "@ai-sdk/react";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DefaultChatTransport } from "ai";
import { Fragment, startTransition, useMemo, useState } from "react";
import type { MyMessage } from "./api/chat/route";
import { useFocusWhenNoChatIdPresent } from "./use-focus-chat-when-new-chat-button-pressed";

export const Chat = (props: { chat: DB.Chat | null }) => {
  const [backupChatId, setBackupChatId] = useState(crypto.randomUUID());
  const [input, setInput] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatIdFromSearchParams = searchParams.get("chatId");

  const chatIdInUse = chatIdFromSearchParams || backupChatId;
  const { messages, sendMessage, status, regenerate } = useChat<MyMessage>({
    id: chatIdInUse,
    messages: props.chat?.messages || [],
    onData: (message) => {
      if (
        message.type === "data-frontend-action" &&
        message.data === "refresh-sidebar"
      ) {
        router.refresh();
      }
    },
    onFinish: () => {
      router.refresh();
    },
    generateId: () => crypto.randomUUID(),
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: (request) => {
        return {
          body: {
            id: request.body?.id,
            message: request.messages[request.messages.length - 1],
          },
        };
      },
    }),
  });

  const ref = useFocusWhenNoChatIdPresent(chatIdFromSearchParams);

  const wrappedSendMessage: typeof sendMessage = async (message, options) => {
    return sendMessage(message, {
      ...options,
      body: {
        id: chatIdInUse,
        ...options?.body,
      },
    });
  };

  const outstandingDecisions = useMemo(() => {
    const allMessageParts = messages.flatMap((message) => message.parts);

    const toolIdsOfAllRequests = new Set(
      allMessageParts
        .filter((part) => part.type === "data-approval-request")
        .map((part) => part.data.tool.id)
    );

    const toolIdsOfAllDecisions = new Set(
      allMessageParts
        .filter((part) => part.type === "data-approval-decision")
        .map((part) => part.data.toolId)
    );

    // Get the tool IDs that have requests but no decisions
    const outstandingDecisions = toolIdsOfAllRequests.difference(
      toolIdsOfAllDecisions
    );

    return outstandingDecisions;
  }, [messages]);

  const [toolIdGivingFeedbackOn, setToolIdGivingFeedbackOn] = useState<
    string | null
  >(null);

  const isGivingFeedback = !!toolIdGivingFeedbackOn;
  const shouldDisableInput = outstandingDecisions.size > 0 && !isGivingFeedback;

  const handlePressApprove = (toolId: string) => {
    wrappedSendMessage({
      parts: [
        {
          type: "data-approval-decision",
          data: {
            toolId,
            decision: {
              type: "approve",
            },
          },
        },
      ],
    });
  };

  const handlePressReject = (toolId: string) => {
    setToolIdGivingFeedbackOn(toolId);
    setInput("");
    // Waits for the 'disabled' state to be removed from the input
    // before focusing the input
    setTimeout(() => {
      ref.current?.focus();
    }, 1);
  };

  const handleSubmitRejectReason = () => {
    if (!toolIdGivingFeedbackOn) return;

    wrappedSendMessage({
      parts: [
        {
          type: "data-approval-decision",
          data: {
            toolId: toolIdGivingFeedbackOn,
            decision: {
              type: "reject",
              reason: input,
            },
          },
        },
      ],
    });

    setToolIdGivingFeedbackOn(null);
    setInput("");
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (isGivingFeedback) {
      handleSubmitRejectReason();
      return;
    }

    startTransition(() => {
      wrappedSendMessage({
        text: message.text || "Sent with attachments",
        files: message.files,
      });

      setInput("");

      if (!chatIdFromSearchParams) {
        router.push(`/?chatId=${chatIdInUse}`);
        setBackupChatId(crypto.randomUUID());
      }
    });
  };
  return (
    <div className="relative flex-1 items-center flex flex-col min-h-0 w-full">
      <Conversation className="w-full">
        <ConversationContent className="max-w-4xl mx-auto w-full pb-40">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "assistant" &&
                message.parts.filter((part) => part.type === "source-url")
                  .length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === "source-url"
                        ).length
                      }
                    />
                    {message.parts
                      .filter((part) => part.type === "source-url")
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <Fragment key={`${message.id}-${i}`}>
                        <Message from={message.role}>
                          <MessageContent>
                            <Response>{part.text}</Response>
                          </MessageContent>
                        </Message>
                        {message.role === "assistant" &&
                          i === messages.length - 1 && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() => regenerate()}
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </Action>
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                      </Fragment>
                    );
                  case "reasoning":
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={
                          status === "streaming" &&
                          i === message.parts.length - 1 &&
                          message.id === messages.at(-1)?.id
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  case "tool-search":
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        className="w-full"
                        defaultOpen={false}
                      >
                        <ToolHeader
                          title="Search"
                          type={part.type}
                          state={part.state}
                        />
                        <ToolContent>
                          <div className="space-y-4 p-4">
                            {/* Input parameters */}
                            {part.input && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                  Parameters
                                </h4>
                                <div className="text-sm">
                                  {part.input.keywords && (
                                    <div>
                                      <span className="font-medium">
                                        Keywords:
                                      </span>{" "}
                                      {part.input.keywords.join(", ")}
                                    </div>
                                  )}
                                  {part.input.searchQuery && (
                                    <div>
                                      <span className="font-medium">
                                        Search Query:
                                      </span>{" "}
                                      {part.input.searchQuery}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Email results */}
                            {part.state === "output-available" &&
                              part.output && (
                                <EmailResultsGrid emails={part.output.emails} />
                              )}

                            {/* Error state */}
                            {part.state === "output-error" && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                  Error
                                </h4>
                                <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                                  {part.errorText}
                                </div>
                              </div>
                            )}
                          </div>
                        </ToolContent>
                      </Tool>
                    );
                  case "tool-filterEmails":
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        className="w-full"
                        defaultOpen={false}
                      >
                        <ToolHeader
                          title="Filter Emails"
                          type={part.type}
                          state={part.state}
                        />
                        <ToolContent>
                          <div className="space-y-4 p-4">
                            {/* Input parameters */}
                            {part.input && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                  Filters
                                </h4>
                                <div className="text-sm space-y-1">
                                  {part.input.from && (
                                    <div>
                                      <span className="font-medium">From:</span>{" "}
                                      {part.input.from}
                                    </div>
                                  )}
                                  {part.input.to && (
                                    <div>
                                      <span className="font-medium">To:</span>{" "}
                                      {part.input.to}
                                    </div>
                                  )}
                                  {part.input.contains && (
                                    <div>
                                      <span className="font-medium">
                                        Contains:
                                      </span>{" "}
                                      {part.input.contains}
                                    </div>
                                  )}
                                  {part.input.before && (
                                    <div>
                                      <span className="font-medium">
                                        Before:
                                      </span>{" "}
                                      {new Date(
                                        part.input.before
                                      ).toLocaleString()}
                                    </div>
                                  )}
                                  {part.input.after && (
                                    <div>
                                      <span className="font-medium">
                                        After:
                                      </span>{" "}
                                      {new Date(
                                        part.input.after
                                      ).toLocaleString()}
                                    </div>
                                  )}
                                  {part.input.limit && (
                                    <div>
                                      <span className="font-medium">
                                        Limit:
                                      </span>{" "}
                                      {part.input.limit}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Email results */}
                            {part.state === "output-available" &&
                              part.output && (
                                <EmailResultsGrid emails={part.output.emails} />
                              )}

                            {/* Error state */}
                            {part.state === "output-error" && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                  Error
                                </h4>
                                <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                                  {part.errorText}
                                </div>
                              </div>
                            )}
                          </div>
                        </ToolContent>
                      </Tool>
                    );
                  case "tool-getEmails":
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        className="w-full"
                        defaultOpen={true}
                      >
                        <ToolHeader
                          title="Get Emails"
                          type={part.type}
                          state={part.state}
                        />
                        <ToolContent>
                          <div className="space-y-4 p-4">
                            {/* Input parameters */}
                            {part.input && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                  Parameters
                                </h4>
                                <div className="text-sm space-y-1">
                                  {part.input.ids && (
                                    <div>
                                      <span className="font-medium">
                                        Email IDs:
                                      </span>{" "}
                                      {part.input.ids.length} email
                                      {part.input.ids.length !== 1 ? "s" : ""}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">
                                      Include Thread:
                                    </span>{" "}
                                    {part.input.includeThread ? "Yes" : "No"}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Full email content */}
                            {part.state === "output-available" &&
                              part.output && (
                                <FullEmailDisplay emails={part.output.emails} />
                              )}

                            {/* Error state */}
                            {part.state === "output-error" && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                  Error
                                </h4>
                                <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                                  {part.errorText}
                                </div>
                              </div>
                            )}
                          </div>
                        </ToolContent>
                      </Tool>
                    );
                  case "data-approval-request":
                    return (
                      <Tool
                        key={`${message.id}-${i}`}
                        className="w-full"
                        defaultOpen={true}
                      >
                        <ToolHeader
                          title={`Approval Request: ${part.data.tool.name}`}
                          type={"tool-approval" as const}
                          state="input-available"
                        />

                        <ToolContent>
                          <ToolInput input={part.data.tool.input} />
                          {outstandingDecisions.has(part.data.tool.id) && (
                            <div className="flex gap-2 p-4 pt-0">
                              <Button
                                onClick={() =>
                                  handlePressApprove(part.data.tool.id)
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  handlePressReject(part.data.tool.id)
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </ToolContent>
                      </Tool>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          ))}
          {status === "submitted" && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="absolute bottom-0 flex items-center justify-center w-full sm:px-6 px-5">
        <PromptInput
          onSubmit={handleSubmit}
          className="mb-4"
          globalDrop
          multiple
        >
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder={
                isGivingFeedback
                  ? "Why are you rejecting this tool?"
                  : "What would you like to know?"
              }
              disabled={shouldDisableInput}
              ref={ref}
              autoFocus
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

const EmailResultsGrid = ({
  emails,
}: {
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    to: string | string[];
    snippet?: string;
    timestamp?: string;
  }>;
}) => {
  const [showAll, setShowAll] = useState(false);
  const displayedEmails = showAll ? emails : emails.slice(0, 8);
  const hasMore = emails.length > 8;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Results ({emails.length} {emails.length === 1 ? "email" : "emails"})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedEmails.map((email, idx) => (
          <div
            key={idx}
            className="rounded-md border bg-muted/30 p-3 text-sm space-y-1"
          >
            <div className="font-medium">{email.subject}</div>
            <div className="text-muted-foreground text-xs">
              <span className="font-medium">From:</span> {email.from}
            </div>
            <div className="text-muted-foreground text-xs">
              <span className="font-medium">To:</span>{" "}
              {Array.isArray(email.to) ? email.to.join(", ") : email.to}
            </div>
            {email.snippet && (
              <div className="text-muted-foreground text-xs mt-2 pt-2 border-t">
                {email.snippet}
              </div>
            )}
          </div>
        ))}
      </div>
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          Show more ({emails.length - 8} more)
        </Button>
      )}
    </div>
  );
};

const FullEmailDisplay = ({
  emails,
}: {
  emails: Array<{
    id: string;
    threadId?: string;
    subject: string;
    from: string;
    to: string | string[];
    timestamp?: string;
    body: string;
  }>;
}) => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Full Content ({emails.length} {emails.length === 1 ? "email" : "emails"}
        )
      </h4>
      <div className="space-y-4">
        {emails.map((email, idx) => (
          <div
            key={idx}
            className="rounded-md border bg-muted/30 p-4 text-sm space-y-3"
          >
            <div>
              <div className="font-medium text-base">{email.subject}</div>
              {email.timestamp && (
                <div className="text-muted-foreground text-xs mt-1">
                  {new Date(email.timestamp).toLocaleString()}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">
                <span className="font-medium">From:</span> {email.from}
              </div>
              <div className="text-muted-foreground text-xs">
                <span className="font-medium">To:</span>{" "}
                {Array.isArray(email.to) ? email.to.join(", ") : email.to}
              </div>
            </div>
            <div className="pt-3 border-t whitespace-pre-wrap">
              {email.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
