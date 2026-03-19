ALTER TABLE `priceHistory` MODIFY COLUMN `price` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `currentPrice` bigint;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `previousPrice` bigint;