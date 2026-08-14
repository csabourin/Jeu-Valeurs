import { db, cartesCatalogueTable, dilemmesTable } from "@workspace/db";
import {
  catalogueSeedCards,
  catalogueSeedDilemmas,
  catalogueSeedCounts,
} from "@workspace/db/catalogue-data";
import { logger } from "./logger";
import { isNull } from "drizzle-orm";

const INSERT_BATCH_SIZE = 200;

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

/**
 * Ajoute uniquement les stimuli absents. Les données personnelles ne sont
 * jamais touchées et un redémarrage ne crée pas de doublons.
 */
export async function ensureCatalogueSeeded(): Promise<void> {
  const [existingCards, existingDilemmas] = await Promise.all([
    db
      .select({ sourceId: cartesCatalogueTable.sourceId })
      .from(cartesCatalogueTable),
    db.select({ sourceId: dilemmesTable.sourceId }).from(dilemmesTable),
  ]);

  const existingCardSourceIds = new Set(
    existingCards.map(({ sourceId }) => sourceId).filter(Boolean),
  );
  const existingDilemmaSourceIds = new Set(
    existingDilemmas.map(({ sourceId }) => sourceId).filter(Boolean),
  );

  const missingCards = catalogueSeedCards.filter(
    ({ sourceId }) => !existingCardSourceIds.has(sourceId),
  );
  const missingDilemmas = catalogueSeedDilemmas.filter(
    ({ sourceId }) => !existingDilemmaSourceIds.has(sourceId),
  );

  for (const batch of batches(missingCards, INSERT_BATCH_SIZE)) {
    await db.insert(cartesCatalogueTable).values(
      batch.map((card) => ({
        sourceId: card.sourceId,
        famille: card.famille,
        categorie: card.categorie,
        label: card.label,
        description: card.description,
        valeursSuggerees: card.valeursSuggerees,
        estPersonnalisable: true,
      })),
    );
  }

  for (const batch of batches(missingDilemmas, INSERT_BATCH_SIZE)) {
    await db.insert(dilemmesTable).values(
      batch.map((dilemma) => ({
        sourceId: dilemma.sourceId,
        valeurA: dilemma.valeurA,
        valeurB: dilemma.valeurB,
        texte: dilemma.texte,
        contexte: dilemma.contexte,
        familles: dilemma.familles,
        pivotDimensionCandidate: dilemma.pivotDimensionCandidate,
      })),
    );
  }

  // Les 36 stimuli générés pour la maquette n'ont pas d'identifiant de source.
  // Les retirer après l'import rend le catalogue conforme au paquet canonique,
  // sans toucher aux copies déjà sélectionnées dans les sessions.
  const [removedLegacyCards, removedLegacyDilemmas] = await Promise.all([
    db
      .delete(cartesCatalogueTable)
      .where(isNull(cartesCatalogueTable.sourceId))
      .returning({ id: cartesCatalogueTable.id }),
    db
      .delete(dilemmesTable)
      .where(isNull(dilemmesTable.sourceId))
      .returning({ id: dilemmesTable.id }),
  ]);

  logger.info(
    {
      insertedCards: missingCards.length,
      insertedDilemmas: missingDilemmas.length,
      removedLegacyCards: removedLegacyCards.length,
      removedLegacyDilemmas: removedLegacyDilemmas.length,
      expectedCounts: catalogueSeedCounts,
    },
    "Catalogue de valeurs vérifié",
  );
}
