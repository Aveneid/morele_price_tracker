CREATE TABLE `websiteTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`websiteUrl` varchar(2048) NOT NULL,
	`websiteName` varchar(255) NOT NULL,
	`selectors` text NOT NULL,
	`defaultCategory` varchar(255),
	`defaultImageUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `websiteTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `websiteTemplates_websiteUrl_unique` UNIQUE(`websiteUrl`)
);
