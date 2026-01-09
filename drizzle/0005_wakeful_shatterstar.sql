ALTER TABLE `settings` ADD `userEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `settings` ADD `emailNotificationsEnabled` int DEFAULT 0 NOT NULL;