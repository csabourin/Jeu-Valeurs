import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const etapesSession = [
  "accueil",
  "selection_cartes",
  "confirmation_valeurs",
  "collisions",
  "constellation",
] as const;

export type EtapeSession = (typeof etapesSession)[number];

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  etapeCourante: text("etape_courante")
    .notNull()
    .default("accueil")
    .$type<EtapeSession>(),
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
