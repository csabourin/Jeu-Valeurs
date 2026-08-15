import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Un bloc d'arbitrage joué : quatre cartes de la personne, celle qu'elle a
 * mise devant et celle qu'elle a mise derrière.
 *
 * `carteIds` fige la composition du bloc au moment où il a été joué. Le plan
 * se recalcule à partir de la graine, mais si la personne retire une carte
 * ensuite, la réponse doit rester lisible telle qu'elle a été donnée — sinon
 * l'écran « D'où ça sort ? » montrerait un bloc que personne n'a vu.
 *
 * `carteMeilleure` et `cartePire` sont nulles ensemble quand le bloc a été
 * passé. Le bloc compte alors comme répondu — il ne doit pas revenir — mais ne
 * pèse sur aucun score.
 */
export const arbitragesTable = pgTable("arbitrages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  /** Rang du bloc dans la partie, à partir de 1. */
  bloc: integer("bloc").notNull(),
  carteIds: jsonb("carte_ids").notNull().default([]).$type<string[]>(),
  carteMeilleure: text("carte_meilleure"),
  cartePire: text("carte_pire"),
  version: integer("version").notNull().default(1),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  miseAJourLe: timestamp("mise_a_jour_le", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertArbitrageSchema = createInsertSchema(arbitragesTable).omit({
  id: true,
  creeLe: true,
  miseAJourLe: true,
});

export type InsertArbitrage = z.infer<typeof insertArbitrageSchema>;
export type Arbitrage = typeof arbitragesTable.$inferSelect;
