import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Le parcours : découvrir → nommer → ordonner → observer → mettre à l'épreuve.
 *
 * `epreuve` ne s'atteint jamais toute seule : c'est un bouton, après le premier
 * portrait. Le jeu ne pousse personne dans l'introspection avant qu'elle ait vu
 * de quoi il parle.
 */
export const etapesSession = [
  "accueil",
  "selection_cartes", // découvrir
  "confirmation_valeurs", // nommer
  "ordination", // ordonner — la première passe de duels
  "constellation", // observer, puis comprendre
  "epreuve", // mettre à l'épreuve
] as const;

export type EtapeSession = (typeof etapesSession)[number];

/**
 * Les étapes des versions précédentes, gardées lisibles.
 *
 * Une partie commencée avant la refonte porte encore `collisions`, `bascules`
 * ou `arbitrages` en base. La colonne n'a pas de contrainte : plutôt que de
 * réécrire les lignes existantes, on traduit à la lecture.
 */
const etapesHeritees: Record<string, EtapeSession> = {
  arbitrages: "ordination",
  collisions: "ordination",
  bascules: "epreuve",
};

export function normaliserEtape(etape: string): EtapeSession {
  if ((etapesSession as readonly string[]).includes(etape)) {
    return etape as EtapeSession;
  }
  return etapesHeritees[etape] ?? "accueil";
}

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
