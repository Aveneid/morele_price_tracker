import { describe, it, expect, beforeEach, vi } from "vitest";
import { broadcastDebugLog, broadcastSqlQuery, isDebugModeEnabled } from "./debugBroadcaster";

describe("Debug Broadcaster", () => {
  beforeEach(() => {
    // Reset environment
    process.env.DEBUG_MODE = "false";
  });

  it("should not broadcast when debug mode is disabled", () => {
    process.env.DEBUG_MODE = "false";
    
    // Should not throw
    expect(() => {
      broadcastDebugLog("TEST", "message");
      broadcastSqlQuery("SELECT * FROM products", []);
    }).not.toThrow();
  });

  it("should check debug mode status", () => {
    process.env.DEBUG_MODE = "false";
    expect(isDebugModeEnabled()).toBe(false);

    process.env.DEBUG_MODE = "true";
    expect(isDebugModeEnabled()).toBe(true);
  });

  it("should handle debug log broadcasting with multiple arguments", () => {
    process.env.DEBUG_MODE = "true";
    
    expect(() => {
      broadcastDebugLog("TEST_LABEL", "arg1", { key: "value" }, [1, 2, 3]);
    }).not.toThrow();
  });

  it("should handle SQL query broadcasting with parameters", () => {
    process.env.DEBUG_MODE = "true";
    
    const query = "INSERT INTO products (name, price) VALUES (?, ?)";
    const params = ["Test Product", 99.99];
    
    expect(() => {
      broadcastSqlQuery(query, params);
    }).not.toThrow();
  });

  it("should handle SQL query broadcasting with null parameters", () => {
    process.env.DEBUG_MODE = "true";
    
    const query = "INSERT INTO products (name, category) VALUES (?, ?)";
    const params = ["Test Product", null];
    
    expect(() => {
      broadcastSqlQuery(query, params);
    }).not.toThrow();
  });

  it("should handle SQL query broadcasting with complex types", () => {
    process.env.DEBUG_MODE = "true";
    
    const query = "INSERT INTO products (name, createdAt) VALUES (?, ?)";
    const params = ["Test Product", new Date("2026-02-21T17:30:00Z")];
    
    expect(() => {
      broadcastSqlQuery(query, params);
    }).not.toThrow();
  });
});
