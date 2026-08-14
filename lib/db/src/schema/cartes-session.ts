import {
  pgTable,
  serial,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { Famille } from "./catalogue";

export const cartesSessionTable = pgTable("cartes_session", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  catalogueCarteId: text("catalogue_carte_id"),
  famille: text("famille").notNull().$type<Famille>(),
  label: text("label").notNull(),
  description: text("description"),
  valeursSuggerees: jsonb("valeurs_suggerees")
    .notNull()
    .default([])
    .$type<string[]>(),
  valeursConfirmees: jsonb("valeurs_confirmees")
    .notNull()
    .default([])
    .$type<string[]>(),
  valeurPrincipale: text("valeur_principale"),
  estPersonnalisee: boolean("est_personnalisee").notNull().default(false),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCarteSessionSchema = createInsertSchema(
  cartesSessionTable,
).omit({ id: true, creeLe: true });

export type InsertCarteSession = z.infer<typeof insertCarteSessionSchema>;
export type CarteSession = typeof cartesSessionTable.$inferSelect;
