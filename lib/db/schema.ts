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

export const charactersRelations = relations(characters, ({ many }) => ({
  quests: many(quests),
  weeklyStories: many(weeklyStories),
  journalEntries: many(journalEntries),
  emailPreferences: many(emailPreferences),
  emailDeliveries: many(emailDeliveries),
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

export type Character = typeof characters.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type WeeklyStory = typeof weeklyStories.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type EmailPreference = typeof emailPreferences.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
