CREATE TABLE `mock_exam_attempt_answer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attemptId` integer NOT NULL,
	`questionId` integer NOT NULL,
	`selectedChoiceId` integer,
	`responseText` text,
	`isCorrect` integer,
	`earnedPoints` integer DEFAULT 0,
	FOREIGN KEY (`attemptId`) REFERENCES `mock_exam_attempt`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`questionId`) REFERENCES `mock_exam_question`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selectedChoiceId`) REFERENCES `mock_exam_choice`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attempt_answer_attempt_idx` ON `mock_exam_attempt_answer` (`attemptId`);--> statement-breakpoint
CREATE TABLE `mock_exam_attempt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`examId` integer NOT NULL,
	`userId` text(128),
	`anonId` text(64),
	`status` text DEFAULT 'in_progress' NOT NULL,
	`score` integer,
	`maxScore` integer,
	`startedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`submittedAt` integer,
	FOREIGN KEY (`examId`) REFERENCES `mock_exam_exam`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempt_exam_idx` ON `mock_exam_attempt` (`examId`);--> statement-breakpoint
CREATE INDEX `attempt_user_idx` ON `mock_exam_attempt` (`userId`);--> statement-breakpoint
CREATE INDEX `attempt_anon_idx` ON `mock_exam_attempt` (`anonId`);--> statement-breakpoint
CREATE TABLE `mock_exam_choice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`questionId` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`content` text NOT NULL,
	`isCorrect` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`questionId`) REFERENCES `mock_exam_question`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `choice_question_idx` ON `mock_exam_choice` (`questionId`);--> statement-breakpoint
CREATE TABLE `mock_exam_exam` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text(128) NOT NULL,
	`title` text(256) NOT NULL,
	`description` text,
	`level` text NOT NULL,
	`subject` text(128),
	`durationMinutes` integer,
	`published` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mock_exam_exam_slug_unique` ON `mock_exam_exam` (`slug`);--> statement-breakpoint
CREATE INDEX `exam_level_idx` ON `mock_exam_exam` (`level`);--> statement-breakpoint
CREATE INDEX `exam_published_idx` ON `mock_exam_exam` (`published`);--> statement-breakpoint
CREATE TABLE `mock_exam_question` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`examId` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'single' NOT NULL,
	`prompt` text NOT NULL,
	`passage` text,
	`answerKey` text,
	`points` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`examId`) REFERENCES `mock_exam_exam`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `question_exam_idx` ON `mock_exam_question` (`examId`);