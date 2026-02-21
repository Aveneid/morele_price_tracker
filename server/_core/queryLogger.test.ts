import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryLogger } from "./queryLogger";

describe("QueryLogger", () => {
  let consoleSpy: any;
  let logger: QueryLogger;

  beforeEach(() => {
    logger = new QueryLogger();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log simple string parameters with single quotes", () => {
    const query = "INSERT INTO products (name, url) VALUES (?, ?)";
    const params = ["Test Product", "https://example.com"];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("'Test Product'");
    expect(output).toContain("'https://example.com'");
  });

  it("should handle null values as NULL in SQL", () => {
    const query = "INSERT INTO products (name, category) VALUES (?, ?)";
    const params = ["Test Product", null];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("NULL");
  });

  it("should handle numbers without quotes", () => {
    const query = "INSERT INTO products (name, price) VALUES (?, ?)";
    const params = ["Test Product", 2999.99];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("2999.99");
    // Should NOT have quotes around the number
    expect(output).not.toContain("'2999.99'");
  });

  it("should escape single quotes in string parameters", () => {
    const query = "INSERT INTO products (name) VALUES (?)";
    const params = ["Product's Name"];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    // Single quote should be escaped as two single quotes
    expect(output).toContain("'Product''s Name'");
  });

  it("should handle Date objects as ISO strings", () => {
    const query = "INSERT INTO products (lastCheckedAt) VALUES (?)";
    const testDate = new Date("2026-02-21T17:30:00Z");
    const params = [testDate];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("'2026-02-21T17:30:00.000Z'");
  });

  it("should handle boolean values as TRUE/FALSE", () => {
    const query = "INSERT INTO products (active, archived) VALUES (?, ?)";
    const params = [true, false];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("TRUE");
    expect(output).toContain("FALSE");
  });

  it("should show parameter types in the output", () => {
    const query = "INSERT INTO products (name, price, active) VALUES (?, ?, ?)";
    const params = ["Test", 100, true];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("string");
    expect(output).toContain("number");
    expect(output).toContain("boolean");
  });

  it("should show interpolated query for manual testing", () => {
    const query = "INSERT INTO products (name, url, price) VALUES (?, ?, ?)";
    const params = ["Test Product", "https://example.com", 1999.50];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("Interpolated Query");
    expect(output).toContain("'Test Product'");
    expect(output).toContain("'https://example.com'");
    expect(output).toContain("1999.5"); // JavaScript represents 1999.50 as 1999.5
  });

  it("should handle complex product insertion with all field types", () => {
    const query = `INSERT INTO products (name, url, productCode, category, imageUrl, currentPrice, previousPrice, lastCheckedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      "MSI MAG A750GL PSU",
      "https://www.morele.net/zasilacz-msi-mag-a750gl-pcie5-750w-306-7zp8b11-ce0-12973679",
      "12973679",
      "Power Supplies",
      "https://cdn.morele.net/images/product.jpg",
      2999.99,
      2999.99,
      new Date("2026-02-21T17:30:00Z"),
      null,
    ];

    logger.logQuery(query, params);

    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

    // Verify all text fields are quoted
    expect(output).toContain("'MSI MAG A750GL PSU'");
    expect(output).toContain("'https://www.morele.net/zasilacz-msi-mag-a750gl-pcie5-750w-306-7zp8b11-ce0-12973679'");
    expect(output).toContain("'12973679'");
    expect(output).toContain("'Power Supplies'");

    // Verify numbers are not quoted
    expect(output).toContain("2999.99");
    expect(output).not.toContain("'2999.99'");

    // Verify date is quoted as ISO string
    expect(output).toContain("'2026-02-21T17:30:00.000Z'");

    // Verify null is NULL
    expect(output).toContain("NULL");

    // Verify interpolated query is shown
    expect(output).toContain("Interpolated Query");
  });
});
