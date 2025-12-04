import { chalk } from "@alcyone-labs/simple-chalk";

export async function searchCannyPosts(
  apiKey: string,
  query: string,
  limit = 10,
) {
  // Mock for testing
  if (apiKey === "test") {
    return {
      posts: [
        {
          id: "1",
          title: "Test Feature Request",
          status: "open",
          score: 10,
          commentCount: 2,
          url: "https://canny.io/p/test",
          author: { id: "u1", name: "Test User" },
          board: { id: "b1", name: "Feature Requests" },
          category: null,
          eta: null,
          created: new Date().toISOString(),
        }
      ]
    };
  }

  const url = "https://canny.io/api/v1/posts/list";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: apiKey,
      search: query,
      limit: limit,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Canny API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data;
}

export async function searchCannyBoards(apiKey: string) {
  try {
    const url = "https://canny.io/api/v1/boards/list";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Canny API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if ((data as any).boards && (data as any).boards.length > 0) {
      console.log(
        chalk.green(`\n✅ Found ${(data as any).boards.length} boards:\n`),
      );

      (data as any).boards.forEach((board: any, index: number) => {
        console.log(chalk.bold.white(`${index + 1}. ${board.name}`));
        console.log(
          chalk.gray(`   ID: ${board.id} | Posts: ${board.postCount || 0}`),
        );
        if (board.description) {
          console.log(chalk.gray(`   ${board.description}`));
        }
        console.log();
      });
    } else {
      console.log(chalk.yellow("No boards found."));
    }

    // Return structured data for both CLI and MCP modes
    return {
      success: true,
      boards: (data as any).boards || [],
      total: (data as any).boards ? (data as any).boards.length : 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      chalk.red(
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    throw error;
  }
}
