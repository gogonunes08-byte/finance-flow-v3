CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `transactionTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactionTags_id` PRIMARY KEY(`id`)
);
