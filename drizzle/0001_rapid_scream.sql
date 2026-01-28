CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(50),
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`keywords` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentMethods_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentMethods_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`date` varchar(10) NOT NULL,
	`paymentMethod` varchar(50) NOT NULL DEFAULT 'outro',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
