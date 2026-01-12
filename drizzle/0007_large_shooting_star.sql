ALTER TABLE `products` ADD `checkIntervalMinutes` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `priceAlertThreshold` int DEFAULT 10 NOT NULL;