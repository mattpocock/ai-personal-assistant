import { searchMemoriesInner } from "@/app/memory-search";
import { DB } from "@/lib/persistence-layer";
import { evalite } from "evalite";

const createMemory = (title: string, content: string) => {
  return {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const memories: DB.Memory[] = [
  createMemory("Paris Trip", "User is going to Paris next week."),
  createMemory(
    "Coffee Preference",
    "User prefers dark roast coffee in the morning."
  ),
  createMemory("Favorite Book", "User's favorite book is 'The Great Gatsby'."),
  createMemory(
    "Gym Schedule",
    "User goes to the gym every Tuesday and Thursday at 6pm."
  ),
  createMemory("Pet Name", "User has a cat named Whiskers."),
  createMemory(
    "Programming Language",
    "User prefers TypeScript over JavaScript."
  ),
  createMemory(
    "Music Taste",
    "User enjoys listening to jazz music while working."
  ),
  createMemory("Allergy", "User is allergic to peanuts."),
  createMemory("Birthday", "User's birthday is in December."),
  createMemory("Favorite Color", "User's favorite color is blue."),
  createMemory(
    "Morning Routine",
    "User wakes up at 7am and meditates for 10 minutes."
  ),
  createMemory("Car Model", "User drives a 2020 Honda Civic."),
  createMemory(
    "Favorite Restaurant",
    "User's favorite restaurant is the Italian place on Main Street."
  ),
  createMemory("Hobby", "User enjoys playing chess on weekends."),
  createMemory("Software Tool", "User uses VS Code as their primary editor."),
  createMemory(
    "Weather Preference",
    "User prefers sunny weather over rainy days."
  ),
  createMemory("Movie Genre", "User likes watching science fiction movies."),
  createMemory("Phone Brand", "User uses an iPhone 14."),
  createMemory("Exercise Type", "User prefers running over weightlifting."),
  createMemory("Sleep Schedule", "User goes to bed around 11pm every night."),
  createMemory("Favorite Season", "User's favorite season is autumn."),
  createMemory("Tea Preference", "User drinks green tea in the afternoon."),
  createMemory("News Source", "User reads The New York Times every morning."),
  createMemory("Social Media", "User is active on Twitter but not Facebook."),
  createMemory("Transportation", "User takes the subway to work."),
  createMemory("Dietary Restriction", "User is vegetarian."),
  createMemory("Favorite Sport", "User enjoys watching basketball games."),
  createMemory("Learning Goal", "User wants to learn Spanish this year."),
  createMemory("Home City", "User lives in San Francisco."),
  createMemory("Education", "User studied computer science in college."),
  createMemory(
    "Work Hours",
    "User works from 9am to 5pm Monday through Friday."
  ),
  createMemory(
    "Vacation Style",
    "User prefers beach vacations over mountain trips."
  ),
  createMemory("Reading Habit", "User reads one book per month."),
  createMemory("Cooking Skill", "User enjoys cooking Italian cuisine."),
  createMemory("Tech Gadget", "User owns a smartwatch."),
  createMemory("Commute Time", "User's commute takes 30 minutes each way."),
  createMemory("Weekend Activity", "User likes hiking on Saturday mornings."),
  createMemory("Email Provider", "User uses Gmail for personal emails."),
  createMemory("Streaming Service", "User subscribes to Netflix and Hulu."),
  createMemory("Bank Name", "User banks with Chase."),
  createMemory("Subscription", "User has a Spotify Premium subscription."),
];

evalite("Memories Search", {
  data: [
    {
      input: [
        `User: Could you check how much money I have in my bank account?`,
        `Assistant: I'm sorry, I can't check your bank account.`,
        `User: It's for the trip next week.`,
        `User: It's for the trip next week. I need to know how much money I have.`,
      ].join("\n"),
      expected: {
        memoryTitles: ["Paris Trip", "Bank Name"],
      },
    },
    {
      input: "I want to redecorate my kitchen.",
      expected: {
        memoryTitles: ["Favorite Color", "Cooking Skill"],
      },
    },
    {
      input: "I need to check if this is safe to eat.",
      expected: {
        memoryTitles: ["Allergy"],
      },
    },
    {
      input: "Recommend some movies for me.",
      expected: {
        memoryTitles: ["Movie Genre"],
      },
    },
    {
      input: "I'm having an issue transferring some money.",
      expected: {
        memoryTitles: ["Bank Name"],
      },
    },
    {
      input: "I want to do a year in review",
      expected: {
        memoryTitles: ["Learning Goal", "Birthday", "Reading Habit"],
      },
    },
    {
      input: "I want to clean up my subscriptions.",
      expected: {
        memoryTitles: ["Streaming Service", "Subscription"],
      },
    },
    {
      input: "I'm having some friends over for dinner. I'm cooking.",
      expected: {
        memoryTitles: ["Dietary Restriction", "Allergy", "Cooking Skill"],
      },
    },
  ],
  task: async (input: string) => {
    const memoriesFound = await searchMemoriesInner(
      [
        {
          id: "1",
          role: "user",
          parts: [
            {
              type: "text",
              text: input,
            },
          ],
        },
      ],
      memories
    );

    return memoriesFound
      .map((item) => ({ title: item.item.title, score: item.score }))
      .filter((item) => item.score > 0.45)
      .slice(0, 10);
  },
  scorers: [
    {
      name: "Match Memory Titles",
      scorer: ({ expected, output }) => {
        let score = 0;
        for (const memoryTitle of expected.memoryTitles) {
          if (output.some((item) => item.title === memoryTitle)) {
            score += 1;
          }
        }

        return score / expected.memoryTitles.length;
      },
    },
    {
      name: "Extra Memories",
      description:
        "The assistant should not return any memories that are not in the expected list.",
      scorer: ({ expected, output }) => {
        const memoriesNotInOutput = output.filter(
          (item) => !expected.memoryTitles.includes(item.title)
        );
        return 1 - memoriesNotInOutput.length / output.length;
      },
    },
  ],
});
