import { TopBar } from "@/components/top-bar";
import { SearchInput } from "./search-input";
import { EmailList } from "./email-list";
import { SearchPagination } from "./search-pagination";
import { PerPageSelector } from "./per-page-selector";

const DUMMY_EMAILS = [
  {
    id: "1",
    from: "john.smith@company.com",
    subject: "Q4 Budget Review Meeting",
    preview:
      "Hi team, I wanted to schedule a meeting to review our Q4 budget allocations...",
    content: `Hi team,

I wanted to schedule a meeting to review our Q4 budget allocations and discuss the proposed changes for next quarter.

Key topics:
- Review current spending vs. projections
- Discuss resource allocation for new projects
- Plan for Q1 2024

Please let me know your availability for next week.

Best regards,
John Smith`,
    date: "2024-03-15T10:30:00Z",
  },
  {
    id: "2",
    from: "sarah.johnson@company.com",
    subject: "Project Alpha Status Update",
    preview:
      "The latest milestone has been completed ahead of schedule. Here's a detailed breakdown...",
    content: `Hi everyone,

Great news! The latest milestone for Project Alpha has been completed ahead of schedule.

Achievements:
- Backend API fully implemented and tested
- Frontend dashboard 85% complete
- Integration tests passing at 95%

Next steps:
- Complete remaining UI components
- Conduct user acceptance testing
- Prepare deployment documentation

We're on track for launch next month!

Sarah Johnson
Project Manager`,
    date: "2024-03-14T14:22:00Z",
  },
  {
    id: "3",
    from: "notifications@github.com",
    subject: "Pull Request Merged: Feature/auth-improvements",
    preview: "Your pull request #234 has been merged into main branch...",
    content: `Your pull request has been merged!

Repository: company/main-app
Pull Request: #234 - Feature/auth-improvements
Merged by: @tech-lead
Branch: feature/auth-improvements → main

Changes included:
- Implemented OAuth 2.0 authentication
- Added password reset functionality
- Enhanced security headers
- Updated user session management

View the merged changes: https://github.com/company/main-app/pull/234`,
    date: "2024-03-13T09:15:00Z",
  },
  {
    id: "4",
    from: "hr@company.com",
    subject: "Annual Performance Review Reminder",
    preview:
      "This is a reminder that your annual performance review is scheduled for next week...",
    content: `Dear Employee,

This is a reminder that your annual performance review is scheduled for next week.

Details:
- Date: March 22, 2024
- Time: 2:00 PM - 3:00 PM
- Location: Conference Room B
- Reviewer: Your Direct Manager

Please prepare:
- Self-assessment form (due March 20)
- List of achievements from the past year
- Goals for the upcoming year
- Any questions or concerns

If you need to reschedule, please contact HR at least 48 hours in advance.

Best regards,
Human Resources Department`,
    date: "2024-03-12T08:00:00Z",
  },
  {
    id: "5",
    from: "marketing@newsletter.com",
    subject: "Weekly Tech Digest - March Edition",
    preview:
      "Top stories this week: AI breakthroughs, cloud computing trends, and cybersecurity updates...",
    content: `Weekly Tech Digest - March 2024

TOP STORIES THIS WEEK:

1. AI Breakthroughs
Major advances in language models and computer vision announced at leading tech conference.

2. Cloud Computing Trends
Serverless architecture adoption continues to grow, with 60% of enterprises now using serverless functions.

3. Cybersecurity Updates
New zero-day vulnerabilities discovered in popular frameworks. Patches available now.

4. Developer Tools
GitHub announces new AI-powered code review features.

5. Industry News
Tech giants report strong Q1 earnings despite market challenges.

Read full articles at newsletter.com/tech-digest

Unsubscribe | Update Preferences`,
    date: "2024-03-11T07:00:00Z",
  },
];

export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const perPage = Number(searchParams.perPage) || 10;

  // Filter emails based on search query
  const filteredEmails = query
    ? DUMMY_EMAILS.filter(
        (email) =>
          email.subject.toLowerCase().includes(query.toLowerCase()) ||
          email.from.toLowerCase().includes(query.toLowerCase()) ||
          email.content.toLowerCase().includes(query.toLowerCase())
      )
    : DUMMY_EMAILS;

  const totalPages = Math.ceil(filteredEmails.length / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedEmails = filteredEmails.slice(
    startIndex,
    startIndex + perPage
  );

  return (
    <div className="h-screen flex flex-col w-full">
      <TopBar showSidebar={false} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Search Data</h1>
            <p className="text-sm text-muted-foreground">
              Search through your email archive
            </p>
          </div>

          <div className="flex md:items-center md:justify-between gap-4 flex-col md:flex-row">
            <SearchInput initialQuery={query} currentPerPage={perPage} />
            <PerPageSelector currentPerPage={perPage} query={query} />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              {query ? (
                <p className="text-sm text-muted-foreground">
                  Found {filteredEmails.length} result
                  {filteredEmails.length !== 1 ? "s" : ""} for &ldquo;{query}
                  &rdquo;
                </p>
              ) : (
                <div />
              )}
            </div>
            <EmailList emails={paginatedEmails} />
            {totalPages > 1 && (
              <div className="mt-6">
                <SearchPagination
                  currentPage={page}
                  totalPages={totalPages}
                  query={query}
                  perPage={perPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
