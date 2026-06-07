CREATE TABLE `mock_exam_session` (
	`id` text(64) PRIMARY KEY NOT NULL,
	`userId` text(36) NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `mock_exam_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `mock_exam_session` (`userId`);--> statement-breakpoint
CREATE TABLE `mock_exam_user` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`email` text(256) NOT NULL,
	`name` text(128),
	`passwordHash` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mock_exam_user_email_unique` ON `mock_exam_user` (`email`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `mock_exam_user` (`email`);