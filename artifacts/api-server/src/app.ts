import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

/**
 * Dernier filet.
 *
 * Sans lui, Express répond une page HTML contenant la trace d'exécution et la
 * requête SQL — que le client attend en JSON, et qui expose l'intérieur du
 * serveur. Le détail reste dans les logs ; l'appelant reçoit de quoi savoir
 * quoi faire.
 */
/** Code PostgreSQL `undefined_table` — le schéma n'a pas été poussé. */
const TABLE_ABSENTE = "42P01";

/**
 * Drizzle enveloppe l'erreur PostgreSQL : son propre `message` ne parle que de
 * la requête ratée, et la cause réelle vit dans `cause`. Il faut donc remonter
 * la chaîne pour reconnaître quoi que ce soit.
 */
function causeRacine(err: unknown): { code?: string; message: string } {
  let courant: unknown = err;
  for (let profondeur = 0; profondeur < 5; profondeur++) {
    const suivant = (courant as { cause?: unknown } | null)?.cause;
    if (!suivant) break;
    courant = suivant;
  }
  const e = courant as { code?: string; message?: string };
  return { code: e?.code, message: e?.message ?? "" };
}

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    req.log?.error({ err }, "Requête en échec");

    if (res.headersSent) return;

    const racine = causeRacine(err);
    const manqueTable =
      racine.code === TABLE_ABSENTE ||
      /relation .* does not exist/i.test(racine.message);

    res.status(manqueTable ? 503 : 500).json({
      error: manqueTable
        ? "La base de données du jeu n'est pas à jour. Lancer : pnpm --filter db push"
        : "Erreur interne du serveur.",
    });
  },
);

export default app;
