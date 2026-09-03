import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), displayName: text("display_name").notNull(),
  createdAt: integer("created_at", { mode:"timestamp" }).notNull().$defaultFn(()=>new Date()),
}, table => [uniqueIndex("idx_users_email").on(table.email)]);

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({autoIncrement:true}), ownerId: text("owner_id").notNull().references(()=>users.id),
  name:text("name").notNull(), code:text("code").notNull(), role:text("role").notNull(), status:text("status").notNull().default("READY"),
  level:integer("level").notNull().default(1), score:real("score").notNull().default(0), successRate:integer("success_rate").notNull().default(100),
  earnedUsd:integer("earned_usd").notNull().default(0), color:text("color").notNull().default("cyan"), skillsJson:text("skills_json").notNull().default("[]"),
  createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
}, table => [uniqueIndex("idx_agents_owner_code").on(table.ownerId,table.code)]);

export const bounties = sqliteTable("bounties", {
  id:integer("id").primaryKey({autoIncrement:true}), ownerId:text("owner_id").notNull().references(()=>users.id), publicCode:text("public_code").notNull(),
  title:text("title").notNull(), sponsor:text("sponsor").notNull(), rewardAmount:integer("reward_amount").notNull(), rewardAsset:text("reward_asset").notNull().default("USDT"),
  difficulty:text("difficulty").notNull().default("EXPERT"), status:text("status").notNull().default("OPEN"), acceptanceCriteria:text("acceptance_criteria").notNull(),
  skillsJson:text("skills_json").notNull().default("[]"), deadlineAt:integer("deadline_at",{mode:"timestamp"}).notNull(), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
}, table => [uniqueIndex("idx_bounties_public_code").on(table.publicCode)]);

export const missions = sqliteTable("missions", {
  id:integer("id").primaryKey({autoIncrement:true}), ownerId:text("owner_id").notNull().references(()=>users.id), bountyId:integer("bounty_id").references(()=>bounties.id),
  publicCode:text("public_code").notNull(), name:text("name").notNull(), phase:text("phase").notNull().default("Planning"), status:text("status").notNull().default("ACTIVE"),
  progress:integer("progress").notNull().default(0), payoutAmount:integer("payout_amount").notNull().default(0), payoutAsset:text("payout_asset").notNull().default("USDT"),
  createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
}, table => [uniqueIndex("idx_missions_public_code").on(table.publicCode)]);

export const mandates = sqliteTable("mandates", {
  id:integer("id").primaryKey({autoIncrement:true}), ownerId:text("owner_id").notNull().references(()=>users.id), missionId:integer("mission_id").references(()=>missions.id),
  name:text("name").notNull(), chain:text("chain").notNull().default("bnb-smart-chain"), actionsJson:text("actions_json").notNull(), budgetAmount:integer("budget_amount").notNull(),
  budgetAsset:text("budget_asset").notNull().default("USDT"), expiresAt:integer("expires_at",{mode:"timestamp"}).notNull(), revokedAt:integer("revoked_at",{mode:"timestamp"}),
  createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
});

export const auditEvents = sqliteTable("audit_events", {
  id:integer("id").primaryKey({autoIncrement:true}), actorId:text("actor_id").notNull().references(()=>users.id), entityType:text("entity_type").notNull(), entityId:text("entity_id").notNull(),
  action:text("action").notNull(), payloadJson:text("payload_json").notNull().default("{}"), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
});

export const taskPlans = sqliteTable("task_plans", {
  id:integer("id").primaryKey({autoIncrement:true}), ownerId:text("owner_id").notNull().references(()=>users.id), missionId:integer("mission_id").references(()=>missions.id),
  intent:text("intent").notNull(), status:text("status").notNull().default("READY"), stepsJson:text("steps_json").notNull(), squadJson:text("squad_json").notNull(),
  riskJson:text("risk_json").notNull(), protocol:text("protocol").notNull().default("ERC-8183"), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
});

export const evidence = sqliteTable("evidence", {
  id:integer("id").primaryKey({autoIncrement:true}), ownerId:text("owner_id").notNull().references(()=>users.id), missionId:integer("mission_id").notNull().references(()=>missions.id),
  kind:text("kind").notNull(), uri:text("uri").notNull(), digest:text("digest").notNull(), status:text("status").notNull().default("PENDING"), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date()),
});
