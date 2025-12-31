import { experimental_createMCPClient } from "@ai-sdk/mcp";
import { ToolSet } from "ai";

export const getMCPTools = async () => {
  const httpClient = await experimental_createMCPClient({
    transport: {
      type: "http",
      url: process.env.MCP_URL!,
    },
  });
  const tools = (await httpClient.tools()) as ToolSet;
  for (const tool of Object.keys(tools)) {
    console.log(tool, (tools[tool].inputSchema as any).jsonSchema);
  }
  return deleteUnwantedTools(tools);
};

const deleteUnwantedTools = (tools: ToolSet) => {
  if ("add_tools" in tools) {
    delete tools.add_tools;
  }
  if ("edit_tools" in tools) {
    delete tools.edit_tools;
  }
  return tools;
};

// ADDED: Local schema definitions (commented out as reference)
// {
//   schemas: {
//     google_calendar_find_events: {
//       inputSchema: z
//         .object({
//           instructions: z
//             .string()
//             .describe(
//               "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//             ),
//           end_time: z
//             .string()
//             .optional()
//             .describe("..."),
//           // ... additional fields
//         })
//         .strict(),
//     },
//     // ... other tool schemas
//   },
// }
