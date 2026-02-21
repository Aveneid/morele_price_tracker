# Query Logger Output Examples

This document shows real examples of what you'll see in the console when the QueryLogger is active.

## Example 1: Adding a Product (INSERT Query)

When you add a product from the dashboard, you'll see output like this:

```
====================================================================================================
[SQL QUERY]
Raw Query: INSERT INTO `products` (`name`, `url`, `productCode`, `category`, `imageUrl`, `currentPrice`, `previousPrice`, `lastCheckedAt`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

Parameters (raw):
  [0] string = "MSI MAG A750GL PSU"
  [1] string = "https://www.morele.net/zasilacz-msi-mag-a750gl-pcie5-750w-306-7zp8b11-ce0-12973679"
  [2] string = "12973679"
  [3] string = "Power Supplies"
  [4] string = "https://cdn.morele.net/images/psu.jpg"
  [5] number = 2999.99
  [6] number = 2999.99
  [7] Date = "2026-02-21T17:30:00.000Z"
  [8] null = null

Interpolated Query (for manual testing):
INSERT INTO `products` (`name`, `url`, `productCode`, `category`, `imageUrl`, `currentPrice`, `previousPrice`, `lastCheckedAt`, `userId`) VALUES ('MSI MAG A750GL PSU', 'https://www.morele.net/zasilacz-msi-mag-a750gl-pcie5-750w-306-7zp8b11-ce0-12973679', '12973679', 'Power Supplies', 'https://cdn.morele.net/images/psu.jpg', 2999.99, 2999.99, '2026-02-21T17:30:00.000Z', NULL)
====================================================================================================
```

### What This Shows

1. **Raw Query**: The SQL template with `?` placeholders
2. **Parameters (raw)**: Each parameter with its type and value
   - **Text parameters** (strings): Shown with quotes in JSON format
   - **Numbers**: Shown without quotes
   - **Dates**: Shown as ISO strings
   - **Null values**: Shown as `null`
3. **Interpolated Query**: The complete SQL with actual values substituted
   - **Text values**: Wrapped in single quotes `'...'`
   - **Numbers**: No quotes
   - **Dates**: Wrapped in single quotes as ISO strings
   - **Null values**: Shown as `NULL` (SQL keyword)

## Example 2: Fetching Products (SELECT Query)

```
====================================================================================================
[SQL QUERY]
Raw Query: SELECT * FROM `products` WHERE `userId` = ? LIMIT ?

Parameters (raw):
  [0] number = 1
  [1] number = 100

Interpolated Query (for manual testing):
SELECT * FROM `products` WHERE `userId` = 1 LIMIT 100
====================================================================================================
```

## Example 3: Recording Price (INSERT with NULL)

```
====================================================================================================
[SQL QUERY]
Raw Query: INSERT INTO `priceHistory` (`productId`, `price`, `recordedAt`) VALUES (?, ?, ?)

Parameters (raw):
  [0] number = 5
  [1] number = 2899.50
  [2] Date = "2026-02-21T17:35:15.000Z"

Interpolated Query (for manual testing):
INSERT INTO `priceHistory` (`productId`, `price`, `recordedAt`) VALUES (5, 2899.50, '2026-02-21T17:35:15.000Z')
====================================================================================================
```

## Key Points About Parameter Formatting

### Text Parameters (Strings)
- **Raw display**: `"Product Name"` (with double quotes, JSON format)
- **SQL display**: `'Product Name'` (with single quotes, SQL format)
- **Escaping**: Single quotes inside strings are doubled: `'O''Reilly'`

### Numbers
- **Raw display**: `2999.99` (no quotes)
- **SQL display**: `2999.99` (no quotes)
- **No type conversion**: Numbers stay as-is

### Dates
- **Raw display**: `"2026-02-21T17:30:00.000Z"` (ISO string in JSON)
- **SQL display**: `'2026-02-21T17:30:00.000Z'` (ISO string in SQL)

### Null Values
- **Raw display**: `null` (JavaScript null)
- **SQL display**: `NULL` (SQL keyword, no quotes)

## How to Use This for Debugging

### 1. Verify Text Parameters Are Quoted
When you see the Interpolated Query, all text values should be in single quotes:
```sql
-- ✓ Correct
INSERT INTO products (name) VALUES ('Test Product')

-- ✗ Wrong (would cause SQL error)
INSERT INTO products (name) VALUES (Test Product)
```

### 2. Check Parameter Types
Look at the Parameters section to verify:
- String parameters are marked as `string`
- Numeric prices are marked as `number` (not strings)
- Dates are marked as `Date`
- Missing values are `null`

### 3. Copy and Run Manually
You can copy the Interpolated Query and run it directly in your database client to:
- Test the query independently
- Check for syntax errors
- Verify the data being inserted

### 4. Spot N+1 Query Problems
If you see many similar queries logged in quick succession, it might indicate an N+1 problem where you're querying in a loop instead of batching.

## Example: Checking Text Parameter Quoting

When adding a product with special characters:

```
Raw Query: INSERT INTO `products` (`name`) VALUES (?)

Parameters (raw):
  [0] string = "Product's Name (Special)"

Interpolated Query (for manual testing):
INSERT INTO `products` (`name`) VALUES ('Product''s Name (Special)')
```

Notice how:
- The single quote in `Product's` becomes `Product''s` (doubled)
- The parentheses are preserved as-is
- The entire string is wrapped in single quotes

This is the correct SQL escaping for text parameters.

## Disabling Query Logging

If you want to disable query logging (e.g., for production), modify `server/db.ts`:

```typescript
// Remove the logger
_db = drizzle(process.env.DATABASE_URL);

// Or conditionally enable
_db = drizzle(process.env.DATABASE_URL, {
  logger: process.env.NODE_ENV === 'development' ? new QueryLogger() : undefined,
});
```

## Related Files

- `server/_core/queryLogger.ts` - The logger implementation
- `server/db.ts` - Where the logger is configured
- `server/_core/queryLogger.test.ts` - Comprehensive test suite (9 tests, all passing)
