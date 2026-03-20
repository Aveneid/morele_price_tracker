CREATE TABLE `userPriceAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userFingerprint` varchar(255) NOT NULL,
	`productId` int NOT NULL,
	`alertType` enum('price','percent') NOT NULL DEFAULT 'percent',
	`threshold` bigint NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPriceAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userPriceAlerts` ADD CONSTRAINT `userPriceAlerts_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;