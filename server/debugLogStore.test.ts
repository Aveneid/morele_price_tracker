import { describe, it, expect, beforeEach } from "vitest";
import {
  addDebugLog,
  addSqlQuery,
  getDebugLogs,
  clearDebugLogs,
  getDebugLogsCount,
} from "./debugLogStore";

describe("Debug Log Store", () => {
  beforeEach(() => {
    clearDebugLogs();
  });

  it("should add and retrieve debug logs", () => {
    addDebugLog("TEST", "message");
    const logs = getDebugLogs();
    
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe("debug_log");
    expect(logs[0].label).toBe("TEST");
    expect(logs[0].args).toEqual(["message"]);
  });

  it("should add and retrieve SQL queries", () => {
    addSqlQuery("SELECT * FROM products", []);
    const logs = getDebugLogs();
    
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe("sql_query");
    expect(logs[0].query).toBe("SELECT * FROM products");
    expect(logs[0].params).toEqual([]);
  });

  it("should add SQL queries with parameters", () => {
    addSqlQuery("INSERT INTO products (name, price) VALUES (?, ?)", ["Test", 99.99]);
    const logs = getDebugLogs();
    
    expect(logs).toHaveLength(1);
    expect(logs[0].params).toEqual(["Test", 99.99]);
  });

  it("should maintain max log limit of 100", () => {
    for (let i = 0; i < 150; i++) {
      addDebugLog(`LOG_${i}`, `message ${i}`);
    }
    
    const logs = getDebugLogs();
    expect(logs).toHaveLength(100);
    expect(logs[0].label).toBe("LOG_50"); // First 50 should be removed
    expect(logs[99].label).toBe("LOG_149"); // Last should be the newest
  });

  it("should return correct log count", () => {
    addDebugLog("TEST1", "msg1");
    addDebugLog("TEST2", "msg2");
    addSqlQuery("SELECT * FROM products", []);
    
    expect(getDebugLogsCount()).toBe(3);
  });

  it("should clear all logs", () => {
    addDebugLog("TEST", "message");
    addSqlQuery("SELECT * FROM products", []);
    
    expect(getDebugLogsCount()).toBe(2);
    clearDebugLogs();
    expect(getDebugLogsCount()).toBe(0);
  });

  it("should filter logs by timestamp", () => {
    addDebugLog("LOG1", "first");
    const pastTimestamp = new Date(Date.now() - 10000).toISOString();
    addDebugLog("LOG2", "second");
    
    const logsSince = getDebugLogs(pastTimestamp);
    expect(logsSince.length).toBeGreaterThanOrEqual(2);
  });

  it("should include timestamp in logs", () => {
    addDebugLog("TEST", "message");
    const logs = getDebugLogs();
    
    expect(logs[0].timestamp).toBeDefined();
    expect(new Date(logs[0].timestamp).getTime()).toBeGreaterThan(0);
  });

  it("should handle multiple arguments in debug logs", () => {
    addDebugLog("TEST", "arg1", { key: "value" }, [1, 2, 3]);
    const logs = getDebugLogs();
    
    expect(logs[0].args).toEqual(["arg1", { key: "value" }, [1, 2, 3]]);
  });
});
