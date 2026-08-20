CREATE TABLE `activityEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int,
	`eventType` varchar(40) NOT NULL,
	`durationMs` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attemptAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` json,
	`points` int,
	`graderComment` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attemptAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`userId` int NOT NULL,
	`score` int,
	`status` enum('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(32) NOT NULL,
	`category` enum('教材','マニュアル','規程','ケース記録','参考資料') NOT NULL DEFAULT '教材',
	`importance` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`usageStatus` enum('active','paused') NOT NULL DEFAULT 'active',
	`pageCount` int NOT NULL DEFAULT 1,
	`sourceUrl` text,
	`extractedText` text,
	`headings` json,
	`keywords` json,
	`figureDescriptions` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prompt` text NOT NULL,
	`type` enum('single','multi','true_false','ordering','numeric','comparison','short_answer') NOT NULL,
	`options` json,
	`answer` json NOT NULL,
	`explanation` text NOT NULL,
	`evidence` json NOT NULL,
	`difficulty` enum('basic','standard','advanced') NOT NULL DEFAULT 'standard',
	`points` int NOT NULL DEFAULT 10,
	`tags` json,
	`status` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`questionId` int NOT NULL,
	`sortOrder` int NOT NULL,
	CONSTRAINT `testQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`questionCount` int NOT NULL DEFAULT 10,
	`passScore` int NOT NULL DEFAULT 70,
	`timeLimitMinutes` int NOT NULL DEFAULT 30,
	`attemptLimit` int NOT NULL DEFAULT 1,
	`accessMode` enum('closed','specified','timed') NOT NULL DEFAULT 'closed',
	`revealMode` enum('immediate','after_submit','after_period') NOT NULL DEFAULT 'after_submit',
	`status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tests_id` PRIMARY KEY(`id`)
);
