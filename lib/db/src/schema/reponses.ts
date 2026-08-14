import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const choixPossibles = [
  "A",
  "B",
  "ca_depend",
  "je_ne_sais_pas",
  "passer",
] as const;

export type ChoixCollision = (typeof choixPossibles)[number];

export const facteursPossibles = [
  "cout_personnel",
  "ampleur_impact",
  "proximite_sociale",
  "nombre_personnes",
  "certitude",
  "reversibilite",
  "urgence",
  "responsabilite",
  "autre",
] as const;

export type FacteurDepend = (typeof facteursPossibles)[number];

export const reponsesCollisionTable = pgTable("reponses_collision", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  /** Identifiant du duel ou du palier de bascule dans `@workspace/contenu`. */
  dilemmeId: integer("dilemme_id"),
  valeurA: text("valeur_a").notNull(),
  valeurB: text("valeur_b").notNull(),
  choix: text("choix").notNull().$type<ChoixCollision>(),
  facteurDepend: text("facteur_depend").$type<FacteurDepend>(),
  facteurDependLibre: text("facteur_depend_libre"),
  difficulte: integer("difficulte"),
  certitude: integer("certitude"),
  /** Série de bascule, si cette réponse en fait partie. */
  serieId: text("serie_id"),
  /** Rang du palier dans la série (1, 2, 3). */
  palier: integer("palier"),
  /** La seule dimension qui bouge dans la série. */
  dimension: text("dimension"),
  /** Valeur que la personne dit avoir voulu protéger, quand on le lui demande. */
  valeurProtegee: text("valeur_protegee"),
  version: integer("version").notNull().default(1),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  miseAJourLe: timestamp("mise_a_jour_le", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertReponseSchema = createInsertSchema(
  reponsesCollisionTable,
).omit({ id: true, creeLe: true, miseAJourLe: true });

export type InsertReponse = z.infer<typeof insertReponseSchema>;
export type ReponseCollision = typeof reponsesCollisionTable.$inferSelect;
