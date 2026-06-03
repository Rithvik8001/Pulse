import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

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

export const charactersRelations = relations(characters, ({ many }) => ({
  quests: many(quests),
}));

export const questsRelations = relations(quests, ({ one }) => ({
  character: one(characters, {
    fields: [quests.characterId],
    references: [characters.id],
  }),
}));

export type Character = typeof characters.$inferSelect;
export type Quest = typeof quests.$inferSelect;
