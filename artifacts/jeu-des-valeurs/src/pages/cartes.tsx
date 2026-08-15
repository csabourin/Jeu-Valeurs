import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useListCartesProposees,
  getListCartesProposeesQueryKey,
  useListCartessCatalogue,
  getListCartessCatalogueQueryKey,
  useListCartesSession,
  getListCartesSessionQueryKey,
  useAddCarteSession,
  useRemoveCarteSession,
  useUpdateSession,
  type CarteCatalogue,
  type CarteCatalogueFamille,
  type CarteSession,
} from "@workspace/api-client-react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Heart,
  Plus,
  MoveRight,
  Loader2,
  LibraryBig,
  PenLine,
  Search,
  Target,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignalerErreur } from "@/hooks/use-erreur";

/** En dessous, il n'y a pas assez de matière pour construire des duels. */
const MINIMUM_CARTES = 3;
const LIMITE_RESULTATS = 80;

type FiltreFamille = CarteCatalogueFamille | "toutes";

function normaliser(texte: string): string {
  return texte
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const familles: {
  cle: CarteCatalogueFamille;
  titre: string;
  phrase: string;
  invite: string;
  exemple: string;
  icon: typeof Ban;
  ton: string;
}[] = [
  {
    cle: "lignes_rouges",
    titre: "Mes limites",
    phrase: "Ce que je refuse de faire",
    invite:
      "Des gestes et des compromis qui iraient trop loin pour toi. Choisis ce qui sonne vrai — pas ce qui sonne bien.",
    exemple: "Ex. : Laisser quelqu'un se faire accuser à ma place",
    icon: Ban,
    ton: "famille-limites",
  },
  {
    cle: "horizons",
    titre: "Mes aspirations",
    phrase: "Ce vers quoi je veux aller",
    invite:
      "Ce que tu veux vivre, construire, apprendre ou devenir. Un désir proche compte autant qu'un grand projet.",
    exemple: "Ex. : Devenir vraiment bon dans quelque chose que j'aime",
    icon: Target,
    ton: "famille-aspirations",
  },
  {
    cle: "tresors",
    titre: "Mes essentiels",
    phrase: "Ce que je veux préserver",
    invite:
      "Ce qui existe déjà dans ta vie et que tu veux garder, protéger ou continuer à nourrir.",
    exemple: "Ex. : Le calme quand je rentre chez moi",
    icon: Heart,
    ton: "famille-essentiels",
  },
];

export default function Cartes() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [ongletActif, setOngletActif] =
    useState<CarteCatalogueFamille>("lignes_rouges");
  const [saisieLibre, setSaisieLibre] = useState<Record<string, string>>({});
  const [bibliothequeOuverte, setBibliothequeOuverte] = useState(false);
  const [rechercheCatalogue, setRechercheCatalogue] = useState("");
  const rechercheDifferee = useDeferredValue(rechercheCatalogue);
  const [filtreFamille, setFiltreFamille] = useState<FiltreFamille>("toutes");
  const [masquerChoisies, setMasquerChoisies] = useState(false);

  // La main tirée pour cette partie, pas les 885 cartes du catalogue.
  const { data: catalogue, isLoading: chargeCatalogue } =
    useListCartesProposees(sessionId, {
      query: {
        enabled: !!sessionId,
        queryKey: getListCartesProposeesQueryKey(sessionId),
      },
    });

  const { data: catalogueComplet, isLoading: chargeCatalogueComplet } =
    useListCartessCatalogue(undefined, {
      query: {
        enabled: bibliothequeOuverte,
        queryKey: getListCartessCatalogueQueryKey(),
        staleTime: 5 * 60 * 1000,
      },
    });

  const { data: mesCartes, isLoading: chargeMesCartes } = useListCartesSession(
    sessionId,
    {
      query: {
        enabled: !!sessionId,
        queryKey: getListCartesSessionQueryKey(sessionId),
      },
    },
  );

  const ajouter = useAddCarteSession();
  const retirer = useRemoveCarteSession();
  const majSession = useUpdateSession();
  const signaler = useSignalerErreur();

  const rafraichir = () =>
    queryClient.invalidateQueries({
      queryKey: getListCartesSessionQueryKey(sessionId),
    });

  const choisies = useMemo(() => {
    const parId = new Map<string, CarteSession>();
    for (const c of mesCartes ?? []) {
      if (c.catalogueCarteId != null) parId.set(c.catalogueCarteId, c);
    }
    return parId;
  }, [mesCartes]);

  const resultatsCatalogue = useMemo(() => {
    const terme = normaliser(rechercheDifferee.trim());

    return (catalogueComplet ?? [])
      .filter(
        (carte) =>
          filtreFamille === "toutes" || carte.famille === filtreFamille,
      )
      .filter((carte) => !masquerChoisies || !choisies.has(carte.id))
      .filter((carte) => {
        if (!terme) return true;
        return normaliser(
          [
            carte.label,
            carte.description ?? "",
            carte.categorie ?? "",
            ...carte.valeursSuggérées,
          ].join(" "),
        ).includes(terme);
      })
      .sort((a, b) => {
        if (terme) {
          const aCommence = normaliser(a.label).startsWith(terme);
          const bCommence = normaliser(b.label).startsWith(terme);
          if (aCommence !== bCommence) return aCommence ? -1 : 1;
        }
        return a.label.localeCompare(b.label, "fr");
      });
  }, [
    catalogueComplet,
    choisies,
    filtreFamille,
    masquerChoisies,
    rechercheDifferee,
  ]);

  const ouvrirBibliotheque = () => {
    setFiltreFamille(ongletActif);
    setBibliothequeOuverte(true);
  };

  const basculerCarte = (carte: CarteCatalogue) => {
    const deja = choisies.get(carte.id);
    if (deja) {
      retirer.mutate(
        { sessionId, carteSessionId: deja.id },
        { onSuccess: rafraichir, onError: signaler("Carte pas retirée") },
      );
      return;
    }
    ajouter.mutate(
      {
        sessionId,
        data: {
          catalogueCarteId: carte.id,
          famille: carte.famille,
          label: carte.label,
          description: carte.description,
          valeursSuggérées: carte.valeursSuggérées,
          estPersonnalisée: false,
        },
      },
      { onSuccess: rafraichir, onError: signaler("Carte pas ajoutée") },
    );
  };

  const ajouterLaMienne = (famille: CarteCatalogueFamille) => {
    const texte = saisieLibre[famille]?.trim();
    if (!texte) return;
    ajouter.mutate(
      {
        sessionId,
        data: {
          famille,
          label: texte,
          // Aucune valeur suggérée : le jeu ne devine pas ce que la personne
          // a voulu dire. Elle nommera elle-même à l'étape suivante.
          valeursSuggérées: [],
          estPersonnalisée: true,
        },
      },
      {
        onSuccess: () => {
          setSaisieLibre((prev) => ({ ...prev, [famille]: "" }));
          rafraichir();
        },
        onError: signaler("Carte pas ajoutée"),
      },
    );
  };

  const continuer = () => {
    majSession.mutate(
      { sessionId, data: { etapeCourante: "confirmation_valeurs" } },
      {
        onSuccess: () => setLocation(`/session/${sessionId}/valeurs`),
        onError: signaler("Impossible de continuer"),
      },
    );
  };

  if (chargeCatalogue || chargeMesCartes) {
    return (
      <Shell sessionId={sessionId} etape="cartes">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  const total = mesCartes?.length ?? 0;
  const manquantes = Math.max(0, MINIMUM_CARTES - total);
  const nombreLimites =
    mesCartes?.filter((carte) => carte.famille === "lignes_rouges").length ?? 0;
  const nombreEnjeux =
    mesCartes?.filter(
      (carte) => carte.famille === "horizons" || carte.famille === "tresors",
    ).length ?? 0;
  const pretPourCombattre =
    total >= MINIMUM_CARTES && nombreLimites > 0 && nombreEnjeux > 0;

  return (
    <Shell sessionId={sessionId} etape="cartes">
      <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        <header className="space-y-4">
          <p className="eyebrow">Étape 1 · Choisir</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold">
            Qu'est-ce qui compte pour toi ?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Choisis au moins une limite et quelque chose que tu veux obtenir ou
            garder. Le jeu les mettra face à face pour voir ce qui tient.
          </p>
        </header>
        <section className="catalogue-callout">
          <span className="catalogue-callout-icon">
            <LibraryBig className="size-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold">
              Tu ne trouves pas la bonne phrase ?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Le tirage n'est qu'un point de départ. Recherche aussi dans toutes
              les cartes du jeu.
            </p>
          </div>
          <Button variant="outline" onClick={ouvrirBibliotheque}>
            <Search className="size-4 mr-2" />
            Explorer tout le catalogue
          </Button>
        </section>

        <Tabs
          value={ongletActif}
          onValueChange={(v) => setOngletActif(v as CarteCatalogueFamille)}
        >
          <TabsList className="category-tabs grid w-full grid-cols-3 h-auto p-1.5">
            {familles.map((f) => (
              <TabsTrigger key={f.cle} value={f.cle} className="category-tab">
                <f.icon className="size-4 md:size-5 shrink-0" />
                <span className="min-w-0 text-left">
                  <strong className="block text-xs md:text-sm truncate">
                    {f.titre}
                  </strong>
                  <small className="hidden md:block font-normal opacity-60 truncate">
                    {f.phrase}
                  </small>
                </span>
                <span className="category-count">
                  {mesCartes?.filter((c) => c.famille === f.cle).length ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {familles.map((f) => {
            const dansLaPile = (catalogue ?? []).filter(
              (c) => c.famille === f.cle,
            );
            const perso = (mesCartes ?? []).filter(
              (c) => c.famille === f.cle && c.estPersonnalisée,
            );

            return (
              <TabsContent
                key={f.cle}
                value={f.cle}
                className="mt-7 space-y-6 focus-visible:outline-none"
              >
                <div className={`family-intro ${f.ton}`}>
                  <span className="family-intro-icon">
                    <f.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider opacity-65">
                      {f.titre}
                    </p>
                    <h2 className="text-2xl font-serif font-semibold mt-1">
                      {f.phrase}
                    </h2>
                    <p className="mt-2 opacity-75">{f.invite}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dansLaPile.map((carte) => {
                    const prise = choisies.has(carte.id);
                    return (
                      <button
                        key={carte.id}
                        type="button"
                        aria-pressed={prise}
                        onClick={() => basculerCarte(carte)}
                        data-testid={`carte-${carte.id}`}
                        className={`choice-card text-left rounded-2xl border p-5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          prise
                            ? "choice-card-selected border-primary ring-1 ring-primary/20 bg-primary/5"
                            : "border-border/70 bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <span className="font-medium leading-snug">
                            {carte.label}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`rounded-full p-1 border shrink-0 ${
                              prise
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border"
                            }`}
                          >
                            {prise ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </span>
                        </div>
                        {carte.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {carte.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {carte.valeursSuggérées.map((v) => (
                            <Badge
                              key={v}
                              variant="secondary"
                              className="text-[10px] font-normal opacity-80"
                            >
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.025] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium">Écris la tienne</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Si rien ne correspond, dis-le dans tes mots. {f.exemple}
                  </p>

                  {perso.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {perso.map((c) => (
                        <li key={c.id}>
                          <span className="inline-flex items-center gap-2 bg-primary/10 text-foreground text-sm rounded-full pl-3 pr-1 py-1">
                            {c.label}
                            <button
                              type="button"
                              onClick={() =>
                                retirer.mutate(
                                  { sessionId, carteSessionId: c.id },
                                  { onSuccess: rafraichir },
                                )
                              }
                              aria-label={`Retirer la carte ${c.label}`}
                              className="rounded-full p-1 hover:bg-background/80"
                            >
                              <Plus
                                className="w-3.5 h-3.5 rotate-45"
                                aria-hidden="true"
                              />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-2">
                    <Input
                      value={saisieLibre[f.cle] ?? ""}
                      onChange={(e) =>
                        setSaisieLibre((prev) => ({
                          ...prev,
                          [f.cle]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          ajouterLaMienne(f.cle);
                        }
                      }}
                      aria-label={`Ajouter une carte à « ${f.titre} »`}
                      placeholder="Dans tes mots…"
                      className="bg-background"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => ajouterLaMienne(f.cle)}
                      disabled={
                        !saisieLibre[f.cle]?.trim() || ajouter.isPending
                      }
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </TabsContent>
            );
          })}
          <Dialog
            open={bibliothequeOuverte}
            onOpenChange={setBibliothequeOuverte}
          >
            <DialogContent className="catalogue-dialog">
              <DialogHeader className="catalogue-dialog-header">
                <div className="flex items-start gap-3 pr-8">
                  <span className="catalogue-callout-icon">
                    <LibraryBig className="size-5" />
                  </span>
                  <div>
                    <DialogTitle className="font-serif text-2xl">
                      Toutes les cartes
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Recherche un mot, une situation ou une valeur. Tu peux
                      sélectionner une carte ici exactement comme dans ton
                      tirage.
                    </DialogDescription>
                  </div>
                </div>

                <div className="catalogue-search">
                  <Search className="size-4" aria-hidden="true" />
                  <Input
                    autoFocus
                    value={rechercheCatalogue}
                    onChange={(e) => setRechercheCatalogue(e.target.value)}
                    placeholder="Ex. liberté, famille, travail, dire la vérité…"
                    aria-label="Rechercher dans toutes les cartes"
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                </div>

                <div
                  className="catalogue-filters"
                  aria-label="Filtrer les cartes"
                >
                  <button
                    type="button"
                    aria-pressed={filtreFamille === "toutes"}
                    onClick={() => setFiltreFamille("toutes")}
                  >
                    Toutes
                  </button>
                  {familles.map((famille) => (
                    <button
                      key={famille.cle}
                      type="button"
                      aria-pressed={filtreFamille === famille.cle}
                      onClick={() => setFiltreFamille(famille.cle)}
                    >
                      <famille.icon className="size-3.5" />
                      {famille.titre}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={masquerChoisies}
                    onClick={() => setMasquerChoisies((valeur) => !valeur)}
                    className="sm:ml-auto"
                  >
                    {masquerChoisies && <Check className="size-3.5" />}
                    Masquer mes choix
                  </button>
                </div>
              </DialogHeader>

              <div className="catalogue-results">
                {chargeCatalogueComplet ? (
                  <div className="catalogue-empty">
                    <Loader2 className="size-7 animate-spin text-primary" />
                    <p>On ouvre la bibliothèque…</p>
                  </div>
                ) : resultatsCatalogue.length === 0 ? (
                  <div className="catalogue-empty">
                    <Search className="size-7" />
                    <h3 className="font-serif text-xl font-semibold">
                      Aucune carte ne correspond
                    </h3>
                    <p>
                      Essaie un mot plus court, une autre catégorie, ou écris ta
                      propre phrase dans l'écran précédent.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="catalogue-results-count">
                      <span>
                        {resultatsCatalogue.length} résultat
                        {resultatsCatalogue.length > 1 ? "s" : ""}
                      </span>
                      {resultatsCatalogue.length > LIMITE_RESULTATS && (
                        <span>
                          Les {LIMITE_RESULTATS} premiers sont affichés —
                          précise ta recherche pour aller plus loin.
                        </span>
                      )}
                    </div>
                    <div className="catalogue-results-grid">
                      {resultatsCatalogue
                        .slice(0, LIMITE_RESULTATS)
                        .map((carte) => {
                          const prise = choisies.has(carte.id);
                          const famille = familles.find(
                            (candidate) => candidate.cle === carte.famille,
                          )!;

                          return (
                            <button
                              key={carte.id}
                              type="button"
                              aria-pressed={prise}
                              onClick={() => basculerCarte(carte)}
                              className={`catalogue-result ${
                                prise ? "catalogue-result-selected" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="catalogue-result-family">
                                  <famille.icon className="size-3.5" />
                                  {famille.titre}
                                </span>
                                <span
                                  className={`catalogue-result-action ${
                                    prise
                                      ? "catalogue-result-action-selected"
                                      : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  {prise ? (
                                    <Check className="size-3.5" />
                                  ) : (
                                    <Plus className="size-3.5" />
                                  )}
                                </span>
                              </div>
                              <strong>{carte.label}</strong>
                              {carte.description && <p>{carte.description}</p>}
                              {carte.valeursSuggérées.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
                                  {carte.valeursSuggérées
                                    .slice(0, 3)
                                    .map((valeur) => (
                                      <span
                                        key={valeur}
                                        className="catalogue-value"
                                      >
                                        {valeur}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </Tabs>

        <div className="sticky-action">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{total}</strong> choix retenu
            {total > 1 ? "s" : ""}
            {manquantes > 0
              ? ` — encore ${manquantes} pour commencer`
              : nombreLimites === 0
                ? " — choisis au moins une limite"
                : nombreEnjeux === 0
                  ? " — choisis une aspiration ou un essentiel"
                  : " — prêt pour les combats"}
          </p>
          <Button
            size="lg"
            disabled={!pretPourCombattre || majSession.isPending}
            onClick={continuer}
          >
            Continuer <MoveRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Shell>
  );
}
