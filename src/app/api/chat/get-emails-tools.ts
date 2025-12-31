import { loadEmails } from "@/app/search";
import { tool } from "ai";
import { z } from "zod";

export const getEmailsTool = tool({
  description:
    "Fetch full content of specific emails by their IDs. Use this after searching/filtering to retrieve complete email bodies. Optionally include entire conversation threads.",
  inputSchema: z.object({
    ids: z
      .array(z.string())
      .describe("Array of email IDs to retrieve full content for"),
    includeThread: z
      .boolean()
      .describe(
        "If true, fetch entire conversation threads for the specified emails"
      )
      .default(false),
  }),
  execute: async ({ ids, includeThread }) => {
    console.log("Get emails params:", { ids, includeThread });

    const emails = await loadEmails();

    let results = emails.filter((email) => ids.includes(email.id));

    if (includeThread && results.length > 0) {
      // Get all unique threadIds from the requested emails
      const threadIds = [...new Set(results.map((email) => email.threadId))];

      // Get all emails that belong to these threads
      results = emails.filter((email) => threadIds.includes(email.threadId));

      // Sort by timestamp to maintain conversation order
      results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    console.log(`Returning ${results.length} emails`);

    return {
      emails: results.map((email) => ({
        id: email.id,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        timestamp: email.timestamp,
        body: email.body,
        cc: email.cc,
        inReplyTo: email.inReplyTo,
        references: email.references,
      })),
    };
  },
});
