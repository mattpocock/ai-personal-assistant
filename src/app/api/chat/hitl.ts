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
    // The original tool ID that this decision is for.
    toolId: string;
    decision: ToolApprovalDecision;
  };
  "approval-result": {
    output: unknown;
    // The original tool ID that this output is for.
    toolId: string;
  };
};

export type ToolRequiringApproval = {
  // The id of the request
  id: string;
  // The name of the tool as it appears in the MCP
  name: string;
  // The input to the tool
  input: unknown;
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
            text: "The user approved the tool.",
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

export type HITLError = {
  message: string;
  status: number;
};

export type HITLDecisionsToProcess = {
  tool: ToolRequiringApproval;
  decision: ToolApprovalDecision;
};

export const findDecisionsToProcess = (opts: {
  mostRecentUserMessage: MyMessage;
  mostRecentAssistantMessage: MyMessage | undefined;
}): HITLError | HITLDecisionsToProcess[] => {
  const { mostRecentUserMessage, mostRecentAssistantMessage } = opts;

  // If there's no assistant message in the chat, there's nothing to process.
  if (!mostRecentAssistantMessage) {
    return [];
  }

  // Get all the tools that the assistant has started
  const tools = mostRecentAssistantMessage.parts
    .filter((part) => part.type === "data-approval-request")
    .map((part) => part.data.tool);

  // Get all the decisions that the user has made
  const decisions = new Map(
    mostRecentUserMessage.parts
      .filter((part) => part.type === "data-approval-decision")
      .map((part) => [part.data.toolId, part.data.decision])
  );

  const decisionsToProcess: HITLDecisionsToProcess[] = [];

  for (const tool of tools) {
    const decision = decisions.get(tool.id);

    // If no decision is found, return an error - the user
    // should make a decision before continuing.
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

      // Send the result to the client
      opts.writer.write(messagePart);

      // Add the message part to the last message in the messages array
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
