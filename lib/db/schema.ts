import { relations, sql } from "drizzle-orm";
import {
  check,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

export type QuestStatus = "active" | "archived";
export type CheckInOutcome = "win" | "pass";
export type EmailDeliveryType = "welcome" | "weekly_digest";
export type EmailDeliveryStatus = "pending" | "sent" | "error" | "skipped";
export type AiUsageScopeType = "user" | "global";
export type AiUsageFeature =
  | "pulse-coach"
  | "habit-agent"
  | "weekly-story"
  | "reword-suggestions"
  | "identity-timeline";
export type AiUsagePeriod = "day" | "week";
export type AiUsageEventStatus =
  | "allowed"
  | "blocked"
  | "completed"
  | "failed";

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("characters_user_id_unique").on(table.userId),
    pgPolicy("characters_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("characters_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("characters_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("characters_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const quests = pgTable(
  "quests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    status: text("status").$type<QuestStatus>().default("active").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("quests_user_id_idx").on(table.userId),
    index("quests_character_id_idx").on(table.characterId),
    uniqueIndex("quests_character_position_unique").on(
      table.characterId,
      table.position,
    ),
    check(
      "quests_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
    check(
      "quests_archive_state_check",
      sql`(
        (${table.status} = 'active' and ${table.archivedAt} is null)
        or (${table.status} = 'archived' and ${table.archivedAt} is not null)
      )`,
    ),
    pgPolicy("quests_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("quests_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("quests_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("quests_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const checkIns = pgTable(
  "check_ins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    localDate: date("local_date").notNull(),
    outcome: text("outcome").$type<CheckInOutcome>().notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("check_ins_user_id_idx").on(table.userId),
    index("check_ins_character_id_idx").on(table.characterId),
    index("check_ins_quest_id_idx").on(table.questId),
    uniqueIndex("check_ins_user_quest_date_unique").on(
      table.userId,
      table.questId,
      table.localDate,
    ),
    check(
      "check_ins_outcome_check",
      sql`${table.outcome} in ('win', 'pass')`,
    ),
    pgPolicy("check_ins_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("check_ins_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("check_ins_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("check_ins_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const weeklyStories = pgTable(
  "weekly_stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    weekEnd: date("week_end").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    letterBody: text("letter_body").notNull(),
    patternBullets: jsonb("pattern_bullets").$type<string[]>().notNull(),
    nextQuest: text("next_quest").notNull(),
    modelId: text("model_id").notNull(),
    sourceCheckInCount: integer("source_check_in_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("weekly_stories_user_id_idx").on(table.userId),
    index("weekly_stories_character_id_idx").on(table.characterId),
    uniqueIndex("weekly_stories_user_week_unique").on(
      table.userId,
      table.weekStart,
    ),
    pgPolicy("weekly_stories_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("weekly_stories_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("weekly_stories_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("weekly_stories_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    localDate: date("local_date").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("journal_entries_user_id_idx").on(table.userId),
    index("journal_entries_character_id_idx").on(table.characterId),
    index("journal_entries_local_date_idx").on(table.localDate),
    uniqueIndex("journal_entries_user_date_unique").on(
      table.userId,
      table.localDate,
    ),
    pgPolicy("journal_entries_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("journal_entries_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("journal_entries_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("journal_entries_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const identitySnapshots = pgTable(
  "identity_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    windowDays: integer("window_days").default(90).notNull(),
    headline: text("headline").notNull(),
    summary: text("summary").notNull(),
    identityStatement: text("identity_statement").notNull(),
    themeBullets: jsonb("theme_bullets").$type<string[]>().notNull(),
    evidenceBullets: jsonb("evidence_bullets").$type<string[]>().notNull(),
    nextIdentityMove: text("next_identity_move").notNull(),
    modelId: text("model_id").notNull(),
    sourceCheckInCount: integer("source_check_in_count").notNull(),
    sourceJournalCount: integer("source_journal_count").notNull(),
    sourceStoryCount: integer("source_story_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("identity_snapshots_user_id_idx").on(table.userId),
    index("identity_snapshots_character_id_idx").on(table.characterId),
    uniqueIndex("identity_snapshots_user_period_unique").on(
      table.userId,
      table.periodEnd,
      table.windowDays,
    ),
    pgPolicy("identity_snapshots_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("identity_snapshots_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("identity_snapshots_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("identity_snapshots_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const emailPreferences = pgTable(
  "email_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    productEmailsEnabled: boolean("product_emails_enabled")
      .default(true)
      .notNull(),
    weeklyDigestEnabled: boolean("weekly_digest_enabled")
      .default(true)
      .notNull(),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    welcomeEmailSentAt: timestamp("welcome_email_sent_at", {
      withTimezone: true,
    }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("email_preferences_user_id_unique").on(table.userId),
    uniqueIndex("email_preferences_unsubscribe_token_unique").on(
      table.unsubscribeToken,
    ),
    pgPolicy("email_preferences_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("email_preferences_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("email_preferences_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").$type<EmailDeliveryType>().notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    recipient: text("recipient").notNull(),
    resendId: text("resend_id"),
    status: text("status").$type<EmailDeliveryStatus>().notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("email_deliveries_user_id_idx").on(table.userId),
    index("email_deliveries_type_idx").on(table.type),
    uniqueIndex("email_deliveries_dedupe_key_unique").on(table.dedupeKey),
    check(
      "email_deliveries_type_check",
      sql`${table.type} in ('welcome', 'weekly_digest')`,
    ),
    check(
      "email_deliveries_status_check",
      sql`${table.status} in ('pending', 'sent', 'error', 'skipped')`,
    ),
    pgPolicy("email_deliveries_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const aiUsageBuckets = pgTable(
  "ai_usage_buckets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    scopeType: text("scope_type").$type<AiUsageScopeType>().notNull(),
    scopeId: text("scope_id").notNull(),
    feature: text("feature").$type<AiUsageFeature>().notNull(),
    period: text("period").$type<AiUsagePeriod>().notNull(),
    periodStart: date("period_start").notNull(),
    requestCount: integer("request_count").default(0).notNull(),
    estimatedTokenCount: integer("estimated_token_count").default(0).notNull(),
    inputTokenCount: integer("input_token_count").default(0).notNull(),
    outputTokenCount: integer("output_token_count").default(0).notNull(),
    totalTokenCount: integer("total_token_count").default(0).notNull(),
    blockedCount: integer("blocked_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_usage_buckets_user_id_idx").on(table.userId),
    index("ai_usage_buckets_scope_idx").on(table.scopeType, table.scopeId),
    uniqueIndex("ai_usage_buckets_scope_feature_period_unique").on(
      table.scopeType,
      table.scopeId,
      table.feature,
      table.period,
      table.periodStart,
    ),
    check(
      "ai_usage_buckets_scope_type_check",
      sql`${table.scopeType} in ('user', 'global')`,
    ),
    check(
      "ai_usage_buckets_feature_check",
      sql`${table.feature} in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions', 'identity-timeline')`,
    ),
    check(
      "ai_usage_buckets_period_check",
      sql`${table.period} in ('day', 'week')`,
    ),
    check(
      "ai_usage_buckets_scope_user_check",
      sql`(
        (${table.scopeType} = 'user' and ${table.userId} is not null)
        or (${table.scopeType} = 'global' and ${table.userId} is null)
      )`,
    ),
    pgPolicy("ai_usage_buckets_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    feature: text("feature").$type<AiUsageFeature>().notNull(),
    status: text("status").$type<AiUsageEventStatus>().notNull(),
    period: text("period").$type<AiUsagePeriod>().notNull(),
    periodStart: date("period_start").notNull(),
    estimatedInputTokens: integer("estimated_input_tokens")
      .default(0)
      .notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    finishReason: text("finish_reason"),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_usage_events_user_id_idx").on(table.userId),
    index("ai_usage_events_feature_idx").on(table.feature),
    index("ai_usage_events_status_idx").on(table.status),
    index("ai_usage_events_period_idx").on(table.period, table.periodStart),
    check(
      "ai_usage_events_feature_check",
      sql`${table.feature} in ('pulse-coach', 'habit-agent', 'weekly-story', 'reword-suggestions', 'identity-timeline')`,
    ),
    check(
      "ai_usage_events_status_check",
      sql`${table.status} in ('allowed', 'blocked', 'completed', 'failed')`,
    ),
    check(
      "ai_usage_events_period_check",
      sql`${table.period} in ('day', 'week')`,
    ),
    pgPolicy("ai_usage_events_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    timeZone: text("time_zone").default("UTC").notNull(),
    locale: text("locale").default("en").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("user_settings_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("user_settings_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("user_settings_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

export const charactersRelations = relations(characters, ({ many }) => ({
  quests: many(quests),
  weeklyStories: many(weeklyStories),
  journalEntries: many(journalEntries),
  identitySnapshots: many(identitySnapshots),
  emailPreferences: many(emailPreferences),
  emailDeliveries: many(emailDeliveries),
  userSettings: many(userSettings),
}));

export const questsRelations = relations(quests, ({ one }) => ({
  character: one(characters, {
    fields: [quests.characterId],
    references: [characters.id],
  }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  character: one(characters, {
    fields: [checkIns.characterId],
    references: [characters.id],
  }),
  quest: one(quests, {
    fields: [checkIns.questId],
    references: [quests.id],
  }),
}));

export const weeklyStoriesRelations = relations(weeklyStories, ({ one }) => ({
  character: one(characters, {
    fields: [weeklyStories.characterId],
    references: [characters.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  character: one(characters, {
    fields: [journalEntries.characterId],
    references: [characters.id],
  }),
}));

export const identitySnapshotsRelations = relations(
  identitySnapshots,
  ({ one }) => ({
    character: one(characters, {
      fields: [identitySnapshots.characterId],
      references: [characters.id],
    }),
  }),
);

export const emailPreferencesRelations = relations(
  emailPreferences,
  ({ one }) => ({
    character: one(characters, {
      fields: [emailPreferences.userId],
      references: [characters.userId],
    }),
  }),
);

export const emailDeliveriesRelations = relations(
  emailDeliveries,
  ({ one }) => ({
    character: one(characters, {
      fields: [emailDeliveries.userId],
      references: [characters.userId],
    }),
  }),
);

export const aiUsageBucketsRelations = relations(
  aiUsageBuckets,
  ({ one }) => ({
    character: one(characters, {
      fields: [aiUsageBuckets.userId],
      references: [characters.userId],
    }),
  }),
);

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  character: one(characters, {
    fields: [aiUsageEvents.userId],
    references: [characters.userId],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  character: one(characters, {
    fields: [userSettings.userId],
    references: [characters.userId],
  }),
}));

export type Character = typeof characters.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type WeeklyStory = typeof weeklyStories.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type IdentitySnapshot = typeof identitySnapshots.$inferSelect;
export type EmailPreference = typeof emailPreferences.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
export type AiUsageBucket = typeof aiUsageBuckets.$inferSelect;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
