import { Logger } from "drizzle-orm/logger";
import { addSqlQuery } from "../debugLogStore";

/**
 * Custom Drizzle ORM query logger that logs full SQL queries with parameters
 * Shows both raw parameters and the fully interpolated SQL query
 * Also broadcasts to browser when debug mode is enabled
 */
export class QueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log("\n" + "=".repeat(100));
    console.log("[SQL QUERY]");
    console.log("Raw Query:", query);
    
    if (params && params.length > 0) {
      console.log("\nParameters (raw):");
      params.forEach((param, index) => {
        console.log(`  [${index}] ${this.formatParamType(param)} = ${JSON.stringify(param)}`);
      });
      
      // Build interpolated query for easier reading
      const interpolatedQuery = this.interpolateQuery(query, params);
      console.log("\nInterpolated Query (for manual testing):");
      console.log(interpolatedQuery);
    }
    
    console.log("=".repeat(100) + "\n");
    
    // Store query for retrieval via tRPC
    try {
      addSqlQuery(query, params);
    } catch (error) {
      // Silently fail if store is not available
    }
  }

  /**
   * Interpolate query parameters into the SQL string
   * Replaces ? placeholders with actual values, properly quoted
   */
  private interpolateQuery(query: string, params: unknown[]): string {
    let result = query;
    let paramIndex = 0;

    result = result.replace(/\?/g, () => {
      if (paramIndex >= params.length) {
        return "?"; // Not enough parameters
      }

      const param = params[paramIndex++];
      return this.formatSqlValue(param);
    });

    return result;
  }

  /**
   * Format a parameter value as it would appear in SQL
   */
  private formatSqlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "NULL";
    }

    if (typeof value === "string") {
      // Escape single quotes by doubling them (SQL standard)
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }

    if (value instanceof Date) {
      // Format as ISO string for SQL
      return `'${value.toISOString()}'`;
    }

    // For complex types, use JSON representation
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  /**
   * Format parameter type for display
   */
  private formatParamType(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (value instanceof Date) return "Date";
    return typeof value;
  }
}
