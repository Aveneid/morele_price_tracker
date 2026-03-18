ALTER TABLE `products` DROP FOREIGN KEY `products_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `userId`;