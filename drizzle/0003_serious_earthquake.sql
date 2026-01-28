CREATE TABLE `userSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`globalSpendingLimit` decimal(12,2) NOT NULL DEFAULT '5000.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSettings_userId_unique` UNIQUE(`userId`)
);
