import {
  convertToModelMessages,
  ModelMessage,
  ToolSet,
  UIMessageStreamWriter,
} from "ai";

import { MyMessage } from "./route";

export type ToolApprovalDecision =
  | {
      type: "approve";
    }
  | {
      type: "reject";
      reason: string;
    };

export type ToolApprovalDataParts = {
  "approval-request": {
    tool: ToolRequiringApproval;
  };
  "approval-decision": {
    toolId: string;
    decision: ToolApprovalDecision;
  };
  "approval-result": {
    output: unknown;
    toolId: string;
  };
};

export type ToolRequiringApproval = {
  id: string;
  name: string;
  input: unknown;
};

export type HITLError = {
  message: string;
  status: number;
};

export type HITLDecisionsToProcess = {
  tool: ToolRequiringApproval;
  decision: ToolApprovalDecision;
};

export const annotateMessageHistory = (
  messages: MyMessage[]
): ModelMessage[] => {
  const modelMessages = convertToModelMessages<MyMessage>(messages, {
    convertDataPart(part) {
      if (part.type === "data-approval-request") {
        return {
          type: "text",
          text: `The assistant requested to run the tool: ${
            part.data.tool.name
          } with input: ${JSON.stringify(part.data.tool.input)}`,
        };
      }
      if (part.type === "data-approval-decision") {
        if (part.data.decision.type === "approve") {
          return {
            type: "text",
            text: "The user approved the tool",
          };
        }
        return {
          type: "text",
          text: `The user rejected the tool: ${part.data.decision.reason}`,
        };
      }
      if (part.type === "data-approval-result") {
        return {
          type: "text",
          text: `The tool returned this result: ${JSON.stringify(
            part.data.output
          )}`,
        };
      }
    },
  });
  return modelMessages;
};

export const findDecisionsToProcess = (opts: {
  mostRecentUserMessage: MyMessage;
  mostRecentAssistantMessage: MyMessage | undefined;
}): HITLError | HITLDecisionsToProcess[] => {
  const { mostRecentAssistantMessage, mostRecentUserMessage } = opts;
  if (!mostRecentAssistantMessage) {
    return [];
  }

  const tools = mostRecentAssistantMessage.parts
    .filter((part) => part.type === "data-approval-request")
    .map((part) => part.data.tool);

  const decisions = new Map(
    mostRecentUserMessage.parts
      .filter((part) => part.type === "data-approval-decision")
      .map((part) => [part.data.toolId, part.data.decision])
  );

  const decisionsToProcess: HITLDecisionsToProcess[] = [];

  for (const tool of tools) {
    const decision = decisions.get(tool.id);
    if (!decision) {
      return {
        message: `No decision found for tool ${tool.id}`,
        status: 400,
      };
    }
    decisionsToProcess.push({
      tool,
      decision,
    });
  }
  return decisionsToProcess;
};

export const executeHITLDecisions = async (opts: {
  decisions: HITLDecisionsToProcess[];
  mcpTools: ToolSet;
  writer: UIMessageStreamWriter<MyMessage>;
  messages: MyMessage[];
}) => {
  for (const { tool, decision } of opts.decisions) {
    if (decision.type === "approve") {
      const result = await opts.mcpTools[tool.name].execute?.(tool.input, {
        messages: [],
        toolCallId: "foo",
      });
      const messagePart = {
        type: "data-approval-result" as const,
        data: {
          toolId: tool.id,
          output: result,
        },
      };
      opts.writer.write(messagePart);

      opts.messages[opts.messages.length - 1].parts.push(messagePart);
    }
  }
  return opts.messages;
};

export const makeHITLToolSet = (
  tools: ToolSet,
  writer: UIMessageStreamWriter<MyMessage> | undefined
) => {
  const toolEntries = Object.entries(tools);
  const newTools: ToolSet = {};

  for (const [toolName, tool] of toolEntries) {
    newTools[toolName] = {
      ...tool,
      execute: async (input) => {
        writer?.write({
          type: "data-approval-request",
          data: {
            tool: {
              id: crypto.randomUUID(),
              input,
              name: toolName,
            },
          },
        });
        return "Requested tool execution";
      },
    };
  }
  return newTools;
};
