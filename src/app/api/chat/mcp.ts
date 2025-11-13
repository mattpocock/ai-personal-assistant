import { experimental_createMCPClient } from "@ai-sdk/mcp";

export const getMCPTools = async () => {
  const httpClient = await experimental_createMCPClient({
    transport: {
      type: "http",
      url: process.env.MCP_URL!,
    },
  });

  const tools = await httpClient.tools();

  return tools;
};
