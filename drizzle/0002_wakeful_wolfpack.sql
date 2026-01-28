CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`limit` decimal(12,2) NOT NULL,
	`month` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
