import { experimental_createMCPClient } from "@ai-sdk/mcp";
import { ToolSet } from "ai";

const deleteUnwantedTools = (tools: ToolSet) => {
  if ("add_tools" in tools) {
    delete tools.add_tools;
  }
  if ("edit_tools" in tools) {
    delete tools.edit_tools;
  }

  return tools;
};

export const getMCPTools = async () => {
  const httpClient = await experimental_createMCPClient({
    transport: {
      type: "http",
      url: process.env.MCP_URL!,
    },
  });

  const tools = await httpClient.tools();

  for (const tool of Object.keys(tools)) {
    console.log(tool, (tools[tool].inputSchema as any).jsonSchema);
  }

  return deleteUnwantedTools(tools);
};
