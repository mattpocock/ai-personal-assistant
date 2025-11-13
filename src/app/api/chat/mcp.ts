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

  return deleteUnwantedTools(tools);
};

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
//             .describe(
//               "This field sets the EARLIEST timestamp (lower boundary) to find events. So the events' start_time will be greater than this timestamp: e.g. To find events scheduled for today, the end_time should be set to the earliest of today e.g. To find events scheduled for this week, the end_time should be set to earliest of this week e.g. To find events scheduled for yesterday, the end_time should be set to earliest of yesterday e.g. To find events scheduled for tomorrow, the end_time should be set to earliest of tomorrow"
//             ),
//           eventTypes: z.array(z.string()).optional().describe("Event Type"),
//           start_time: z
//             .string()
//             .optional()
//             .describe(
//               "This field sets the LATEST timestamp (upper boundary) to find events. So the events' end_time will be less than this timestamp: e.g. To find events scheduled for today, the start_time should be set to 'today at 11:59pm' e.g. To find events scheduled for this week, the start_time should be set to 'this week last day at 11:59pm' e.g. To find events scheduled for yesterday, the start_time should be set to 'yesterday 11:59pm' e.g. To find events scheduled for tomorrow, the start_time should be set to 'tomorrow  11:59pm'"
//             ),
//           search_term: z
//             .string()
//             .optional()
//             .describe(
//               'ONLY generate a value for this field if explicitly asked to filter events. Will search across the event name and description. Does not include canceled events. **Note**: Search operators such as `AND` or `OR` do not work here. If you search for more than one word (e.g. `apple banana`) we will only find events with both `apple` *AND* `banana` in them, rather than events that contains `apple` *OR* `banana`. You can also use a negative modifier to exclude terms (example: "-apple")'
//             ),
//           expand_recurring: z
//             .string()
//             .optional()
//             .describe("Expand Recurring Events"),
//         })
//         .strict(),
//     },
//     google_docs_find_a_document: {
//       inputSchema: z
//         .object({
//           instructions: z
//             .string()
//             .describe(
//               "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//             ),
//           title: z.string().optional().describe("Document Name"),
//         })
//         .strict(),
//     },
//     google_calendar_retrieve_event_by_id: {
//       inputSchema: z
//         .object({
//           instructions: z
//             .string()
//             .describe(
//               "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//             ),
//           event_id: z.string().optional().describe("Event ID"),
//           calendarid: z.string().optional().describe("Calendar"),
//         })
//         .strict(),
//     },
//     google_calendar_delete_event: {
//       inputSchema: z
//         .object({
//           instructions: z
//             .string()
//             .describe(
//               "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//             ),
//           eventid: z.string().optional().describe("Event"),
//           calendarid: z.string().optional().describe("Calendar"),
//           send_notifications: z
//             .string()
//             .optional()
//             .describe("Notify Attendees?"),
//         })
//         .strict(),
//     },
//     google_calendar_create_detailed_event: {
//       inputSchema: z
//         .object({
//           instructions: z
//             .string()
//             .describe(
//               "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//             ),
//           all_day: z.string().optional().describe("All day"),
//           summary: z.string().optional().describe("Summary"),
//           location: z.string().optional().describe("Location"),
//           attendees: z.array(z.string()).optional().describe("Attendees"),
//           eventType: z.string().optional().describe("Event Type"),
//           visibility: z.string().optional().describe("Visibility"),
//           description: z.string().optional().describe("Description"),
//           end__dateTime: z.string().optional().describe("End Date & Time"),
//           start__dateTime: z
//             .string()
//             .optional()
//             .describe("Start Date & Time"),
//           recurrence_count: z
//             .string()
//             .optional()
//             .describe("Repeat How Many Times?"),
//           recurrence_until: z.string().optional().describe("Repeat Until"),
//           reminders_methods: z
//             .array(z.string())
//             .optional()
//             .describe("Reminders"),
//           reminders_minutes: z
//             .string()
//             .optional()
//             .describe("Minutes Before Reminders"),
//           recurrence_frequency: z
//             .string()
//             .optional()
//             .describe("Repeat Frequency"),
//           reminders__useDefault: z
//             .string()
//             .optional()
//             .describe("Use Default Reminders?"),
//         })
//         .strict(),
//     },
//     google_calendar_update_event: {
//       inputSchema: z.object({
//         instructions: z
//           .string()
//           .describe(
//             "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//           ),
//         all_day: z.string().optional().describe("All day"),
//         colorId: z.string().optional().describe("Color"),
//         eventid: z.string().optional().describe("Event"),
//         summary: z.string().optional().describe("Summary"),
//         location: z.string().optional().describe("Location"),
//         attendees: z.array(z.string()).optional().describe("Attendees"),
//         calendarid: z.string().optional().describe("Calendar"),
//         visibility: z.string().optional().describe("Visibility"),
//         description: z.string().optional().describe("Description"),
//         transparency: z
//           .string()
//           .optional()
//           .describe("Show me as Free or Busy"),
//         end__dateTime: z.string().optional().describe("End Date & Time"),
//         start__dateTime: z.string().optional().describe("Start Date & Time"),
//         recurrence_count: z
//           .string()
//           .optional()
//           .describe("Repeat How Many Times?"),
//         recurrence_until: z.string().optional().describe("Repeat Until"),
//         reminders_methods: z
//           .array(z.string())
//           .optional()
//           .describe("Reminders"),
//         reminders_minutes: z
//           .string()
//           .optional()
//           .describe("Minutes Before Reminders"),
//         recurrence_frequency: z
//           .string()
//           .optional()
//           .describe("Repeat Frequency"),
//         reminders__useDefault: z
//           .string()
//           .optional()
//           .describe("Use Default Reminders?"),
//       }),
//     },
//     google_tasks_create_task: {
//       inputSchema: z.object({
//         instructions: z
//           .string()
//           .describe(
//             "Instructions for running this tool. Any parameters that are not given a value will be guessed based on the instructions."
//           ),
//         due: z.string().optional().describe("Due On"),
//         notes: z.string().optional().describe("Notes"),
//         title: z.string().optional().describe("Title"),
//         task_list: z.string().optional().describe("Task List"),
//       }),
//     },
//   },
// }
