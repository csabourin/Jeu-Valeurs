import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const etapesSession = [
  "accueil",
  "selection_cartes",
  "confirmation_valeurs",
  "collisions",
  "bascules",
  "constellation",
] as const;

export type EtapeSession = (typeof etapesSession)[number];

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  etapeCourante: text("etape_courante")
    .notNull()
    .default("accueil")
    .$type<EtapeSession>(),
  /**
   * Graine de tirage de la partie. Fixée une fois à la création : c'est elle
   * qui fait que deux parties ne servent pas les mêmes situations, tout en
   * gardant une partie donnée identique à elle-même d'une requête à l'autre.
   */
  graine: integer("graine").notNull().default(0),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  miseAJourLe: timestamp("mise_a_jour_le", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  creeLe: true,
  miseAJourLe: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
