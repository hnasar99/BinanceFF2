CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`success_rate` integer DEFAULT 100 NOT NULL,
	`earned_usd` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT 'cyan' NOT NULL,
	`skills_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agents_owner_code` ON `agents` (`owner_id`,`code`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bounties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`public_code` text NOT NULL,
	`title` text NOT NULL,
	`sponsor` text NOT NULL,
	`reward_amount` integer NOT NULL,
	`reward_asset` text DEFAULT 'USDT' NOT NULL,
	`difficulty` text DEFAULT 'EXPERT' NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`acceptance_criteria` text NOT NULL,
	`skills_json` text DEFAULT '[]' NOT NULL,
	`deadline_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bounties_public_code` ON `bounties` (`public_code`);--> statement-breakpoint
CREATE TABLE `mandates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`mission_id` integer,
	`name` text NOT NULL,
	`chain` text DEFAULT 'bnb-smart-chain' NOT NULL,
	`actions_json` text NOT NULL,
	`budget_amount` integer NOT NULL,
	`budget_asset` text DEFAULT 'USDT' NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mission_id`) REFERENCES `missions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`bounty_id` integer,
	`public_code` text NOT NULL,
	`name` text NOT NULL,
	`phase` text DEFAULT 'Planning' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`payout_amount` integer DEFAULT 0 NOT NULL,
	`payout_asset` text DEFAULT 'USDT' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bounty_id`) REFERENCES `bounties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_missions_public_code` ON `missions` (`public_code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);