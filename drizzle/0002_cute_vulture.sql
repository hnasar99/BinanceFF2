CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`public_code` text NOT NULL,
	`chain` text DEFAULT 'bnb-smart-chain' NOT NULL,
	`pair` text NOT NULL,
	`buy_venue` text NOT NULL,
	`sell_venue` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`source` text DEFAULT 'MOCK' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_opportunities_public_code` ON `opportunities` (`public_code`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`opportunity_id` integer NOT NULL,
	`chain` text DEFAULT 'bnb-smart-chain' NOT NULL,
	`venue` text NOT NULL,
	`pair` text NOT NULL,
	`side` text NOT NULL,
	`price_usd_micros` integer NOT NULL,
	`fee_bps` integer NOT NULL,
	`gas_usd_micros` integer NOT NULL,
	`liquidity_usd_micros` integer NOT NULL,
	`source` text DEFAULT 'MOCK' NOT NULL,
	`status` text DEFAULT 'LIVE' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`opportunity_id` integer NOT NULL,
	`simulation_id` integer NOT NULL,
	`chain` text DEFAULT 'bnb-smart-chain' NOT NULL,
	`decision` text NOT NULL,
	`reasons_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`opportunity_id` integer NOT NULL,
	`chain` text DEFAULT 'bnb-smart-chain' NOT NULL,
	`notional_usd_micros` integer NOT NULL,
	`gross_usd_micros` integer NOT NULL,
	`fees_usd_micros` integer NOT NULL,
	`gas_usd_micros` integer NOT NULL,
	`slippage_usd_micros` integer NOT NULL,
	`net_usd_micros` integer NOT NULL,
	`net_bps` integer NOT NULL,
	`adverse_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
