import { Logger } from "drizzle-orm/logger";

/**
 * Custom Drizzle ORM query logger that logs full SQL queries with parameters
 */
export class QueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log("\n" + "=".repeat(80));
    console.log("[SQL QUERY]");
    console.log("Query:", query);
    if (params && params.length > 0) {
      console.log("Parameters:", JSON.stringify(params, null, 2));
    }
    console.log("=".repeat(80) + "\n");
  }
}
