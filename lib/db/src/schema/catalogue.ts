import {
  pgTable,
  serial,
  text,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const familles = ["lignes_rouges", "horizons", "tresors"] as const;
export type Famille = (typeof familles)[number];

export const cartesCatalogueTable = pgTable("cartes_catalogue", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").unique(),
  famille: text("famille").notNull().$type<Famille>(),
  categorie: text("categorie"),
  label: text("label").notNull(),
  description: text("description"),
  valeursSuggerees: jsonb("valeurs_suggerees")
    .notNull()
    .default([])
    .$type<string[]>(),
  estPersonnalisable: boolean("est_personnalisable").notNull().default(true),
  statut: text("statut").notNull().default("candidate_unvalidated"),
});

export const insertCarteCatalogueSchema = createInsertSchema(
  cartesCatalogueTable,
).omit({ id: true });

export type InsertCarteCatalogue = z.infer<typeof insertCarteCatalogueSchema>;
export type CarteCatalogue = typeof cartesCatalogueTable.$inferSelect;

export const dilemmesTable = pgTable("dilemmes", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").unique(),
  valeurA: text("valeur_a").notNull(),
  valeurB: text("valeur_b").notNull(),
  texte: text("texte").notNull(),
  contexte: text("contexte"),
  familles: jsonb("familles").notNull().default([]).$type<string[]>(),
  pivotDimensionCandidate: text("pivot_dimension_candidate"),
});

export const insertDilemmeSchema = createInsertSchema(dilemmesTable).omit({
  id: true,
});

export type InsertDilemme = z.infer<typeof insertDilemmeSchema>;
export type Dilemme = typeof dilemmesTable.$inferSelect;
