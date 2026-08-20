ALTER TABLE `tests` ADD `targetMaterialIds` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `tests` ADD `targetQuestionIds` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `tests` ADD `formatDistribution` json DEFAULT ('{}');--> statement-breakpoint
ALTER TABLE `tests` ADD `difficultyDistribution` json DEFAULT ('{}');--> statement-breakpoint
ALTER TABLE `tests` ADD `availableFrom` timestamp;--> statement-breakpoint
ALTER TABLE `tests` ADD `availableUntil` timestamp;