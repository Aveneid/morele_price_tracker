# SQL Query Logging Guide

## Overview

The application now logs all SQL queries executed by Drizzle ORM to the console. This allows you to see the exact SQL commands with parameters before they're sent to the database.

## How It Works

### 1. Query Logger Implementation

**File:** `server/_core/queryLogger.ts`

A custom `QueryLogger` class implements Drizzle's `Logger` interface and logs:
- The SQL query string
- All parameters (with JSON formatting for readability)
- Clear visual separators for easy scanning

### 2. Drizzle Configuration

**File:** `server/db.ts` (lines 33-36)

```typescript
_db = drizzle(process.env.DATABASE_URL, {
  logger: new QueryLogger(), // Enable detailed query logging
});
```

When the database connection is initialized, the custom logger is attached to all queries.

## Example Output

When you add a product, you'll see console output like:

```
================================================================================
[SQL QUERY]
Query: INSERT INTO `products` (`name`, `url`, `productCode`, `category`, `imageUrl`, `currentPrice`, `previousPrice`, `lastCheckedAt`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
Parameters: [
  "Product Name",
  "https://www.morele.net/...",
  "12345678",
  "Electronics",
  "https://...",
  2999.99,
  2999.99,
  "2026-02-21T17:30:00.000Z",
  null
]
================================================================================
```

## Testing the Query Logger

### Step 1: Open Dev Server Console

The dev server is running at: https://3000-izqjtgcwg4u7a0fns1deg-307c8ef9.us1.manus.computer

### Step 2: Check Server Logs

Open your terminal where the dev server is running. You should see logs like:

```
[16:43:38] Server running on http://localhost:3000/
```

### Step 3: Trigger a Query

1. Navigate to the Dashboard (click "View Prices" on the landing page)
2. Enter a product URL from morele.net (e.g., `https://www.morele.net/zasilacz-...`)
3. Click "Add Product"
4. Watch the server console for the SQL query output

### Step 4: Review the Query

The console will show:
- **Query**: The SQL command with placeholders (`?`)
- **Parameters**: The actual values being inserted

## What Queries Are Logged?

All Drizzle ORM operations log queries:

- **INSERT**: Adding new products, recording prices, creating jobs
- **SELECT**: Fetching products, checking for duplicates, retrieving price history
- **UPDATE**: Updating product settings, job status
- **DELETE**: Removing products or jobs

## Debugging Tips

### 1. Check Parameter Values

Look at the Parameters array to verify:
- Data types are correct (strings, numbers, dates)
- Null values are handled properly
- No undefined values are being passed

### 2. Verify SQL Syntax

The Query string shows the exact SQL being executed. You can:
- Copy the query to a database client
- Replace `?` with actual parameter values
- Run it manually to test

### 3. Identify Performance Issues

Look for:
- Missing WHERE clauses (full table scans)
- N+1 query patterns (multiple similar queries)
- Inefficient joins

## Disabling Query Logging

If you want to disable query logging (e.g., in production), modify `server/db.ts`:

```typescript
// Option 1: Remove the logger
_db = drizzle(process.env.DATABASE_URL);

// Option 2: Conditionally enable based on environment
_db = drizzle(process.env.DATABASE_URL, {
  logger: process.env.NODE_ENV === 'development' ? new QueryLogger() : undefined,
});
```

## Related Files

- `server/db.ts` - Database initialization with query logger
- `server/_core/queryLogger.ts` - Custom logger implementation
- `server/routers.ts` - tRPC procedures that trigger queries
- `drizzle/schema.ts` - Database schema definitions

## Next Steps

1. Add a product and observe the INSERT query
2. Check the console for the full SQL command
3. Verify all parameters are being passed correctly
4. Use this to debug any database-related issues
