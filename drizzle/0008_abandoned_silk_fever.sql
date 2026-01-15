CREATE TABLE `jobExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`status` enum('pending','running','success','failed') NOT NULL,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`duration` int,
	`result` text,
	`logs` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`jobType` enum('price_check','cleanup','report','custom') NOT NULL,
	`cronExpression` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastExecutedAt` timestamp,
	`nextExecutionAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobExecutions` ADD CONSTRAINT `jobExecutions_jobId_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE cascade ON UPDATE no action;