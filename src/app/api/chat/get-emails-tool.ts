import { loadEmails } from "@/app/search";
import { tool } from "ai";
import { z } from "zod";

export const getEmailsTool = tool({
  description:
    "Fetch full content of specific emails by their IDs. Use this after searching/filtering to retrieve complete email bodies.",
  inputSchema: z.object({
    ids: z
      .array(z.string())
      .describe("Array of email IDs to retrieve full content for"),
  }),
  execute: async ({ ids }) => {
    console.log("Get emails params:", { ids });

    const emails = await loadEmails();

    const results = emails.filter((email) => ids.includes(email.id));

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
