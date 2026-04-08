CREATE TABLE `adminSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminSessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `adminSessions` ADD CONSTRAINT `adminSessions_adminId_adminUsers_id_fk` FOREIGN KEY (`adminId`) REFERENCES `adminUsers`(`id`) ON DELETE cascade ON UPDATE no action;