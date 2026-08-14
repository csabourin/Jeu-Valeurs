import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  useGetConstellation,
  getGetConstellationQueryKey,
  useListReponses,
  getListReponsesQueryKey,
  useUpdateReponse,
} from "@workspace/api-client-react";
import { Loader2, Zap, Scale, Compass, MapPinOff } from "lucide-react";
import { useState } from "react";
import type {
  ObservationConstellation,
  ReponseCollision,
  ReponseCollisionUpdateChoix,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Constellation() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const [selectedObservation, setSelectedObservation] =
    useState<ObservationConstellation | null>(null);
  const [editingResponse, setEditingResponse] =
    useState<ReponseCollision | null>(null);
  const [draftChoice, setDraftChoice] =
    useState<ReponseCollisionUpdateChoix>("A");
  const [draftDifficulty, setDraftDifficulty] = useState(3);
  const [draftConfidence, setDraftConfidence] = useState(3);
  const [draftFactor, setDraftFactor] = useState("cout_personnel");
  const queryClient = useQueryClient();
  const updateResponse = useUpdateReponse();

  const { data: constellation, isLoading } = useGetConstellation(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetConstellationQueryKey(sessionId)
    }
  });
  const { data: responses = [] } = useListReponses(sessionId, {
    query: { enabled: !!sessionId },
  });

  const startCorrection = (response: ReponseCollision) => {
    setEditingResponse(response);
    setDraftChoice(response.choix);
    setDraftDifficulty(response.difficulte ?? 3);
    setDraftConfidence(response.certitude ?? 3);
    setDraftFactor(response.facteurDepend ?? "cout_personnel");
  };

  const submitCorrection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingResponse) return;
    updateResponse.mutate(
      {
        sessionId,
        reponseId: editingResponse.id,
        data: {
          choix: draftChoice,
          facteurDepend: draftChoice === "ca_depend" ? draftFactor : null,
          facteurDependLibre: null,
          difficulte: draftChoice === "passer" ? null : draftDifficulty,
          certitude: draftChoice === "passer" ? null : draftConfidence,
        },
      },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getListReponsesQueryKey(sessionId),
            }),
            queryClient.invalidateQueries({
              queryKey: getGetConstellationQueryKey(sessionId),
            }),
          ]);
          setEditingResponse(null);
          setSelectedObservation(null);
        },
      },
    );
  };

  if (isLoading || !constellation) {
    return (
      <Shell sessionId={sessionId}>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-serif animate-pulse">Cartographie en cours...</p>
        </div>
      </Shell>
    );
  }

  const { tendances, tensions, observations, couverture, stabilite } = constellation;

  return (
    <Shell sessionId={sessionId}>
      <div className="space-y-12 animate-in fade-in duration-700">
        <header className="space-y-4 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            Votre Constellation
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Dans les situations explorées jusqu’ici, certaines tendances se dessinent.
            Elles ne constituent ni un classement définitif ni une prédiction de vos comportements.
          </p>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-primary mb-1">
              {Math.round(couverture * 100)}%
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Exploration</div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-accent mb-1">
              {Math.round(stabilite * 100)}%
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Stabilité testée</div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-serif font-bold text-secondary mb-1">
              {tendances.length}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Valeurs actives</div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-serif font-bold text-destructive mb-1">
              {tensions.filter((tension) => tension.estForte).length}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Tensions fortes</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Tendencies */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Compass className="w-6 h-6 text-primary" /> Tendances provisoires
            </h2>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 space-y-6">
                {tendances.map((t) => (
                  <div key={t.valeur} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{t.valeur}</div>
                      <div className="text-sm text-muted-foreground">
                        {t.totalCollisions > 0
                          ? `${t.victoiresA} choix en sa faveur, ${t.victoiresB} concessions; couverture ${Math.round(t.couverture * 100)} %.`
                          : "Cette valeur n’a pas encore été mise à l’épreuve."}
                        {t.statutProtege ? " Aucun compromis observé jusqu’ici." : ""}
                      </div>
                      {t.preferencesParContexte.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2" aria-label={`Contextes explorés pour ${t.valeur}`}>
                          {t.preferencesParContexte.map((preference) => (
                            <span key={preference.contexte} className="text-xs rounded-full bg-background border border-border px-2 py-1">
                              {preference.contexte} : {Math.round(preference.importanceApparente * 100)} %
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className="w-24 h-2 bg-muted rounded-full overflow-hidden shrink-0"
                      role="progressbar"
                      aria-label={`Importance apparente provisoire de ${t.valeur}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(t.importanceApparente * 100)}
                    >
                      <div 
                        className="h-full bg-primary rounded-full opacity-80" 
                        style={{ width: `${Math.max(5, t.importanceApparente * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2 pt-4">
              <Zap className="w-6 h-6 text-accent" /> Tensions remarquables
            </h2>
            <div className="grid gap-4">
              {tensions.length > 0 ? tensions.map((tension, i) => (
                <Card key={i} className="border-accent/20 bg-accent/5">
                  <CardContent className="p-5 flex items-center justify-between">
                    <span className="font-medium">{tension.valeurA}</span>
                    <div className="flex-1 border-b border-dashed border-accent/40 mx-4 relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-xs px-2 py-0.5 rounded-full text-accent font-medium border border-accent/20">
                        VS
                      </div>
                    </div>
                    <span className="font-medium">{tension.valeurB}</span>
                  </CardContent>
                </Card>
              )) : (
                <div className="text-muted-foreground italic bg-muted/30 p-4 rounded-lg text-sm">
                  Aucune tension majeure identifiée pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Observations */}
          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Scale className="w-6 h-6 text-secondary" /> Observations
            </h2>
            <div className="space-y-4">
              {observations.map((obs) => (
                <div key={obs.id} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm text-sm">
                  <p className="leading-relaxed mb-3">{obs.texte}</p>
                  {obs.reponsesSources?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 text-xs w-full"
                      onClick={() => setSelectedObservation(obs)}
                      aria-label={`Voir les réponses qui expliquent : ${obs.texte}`}
                    >
                      Pourquoi ?
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {tendances.some(t => t.territoireInexplore) && (
              <div className="pt-6">
                <h3 className="font-serif font-semibold flex items-center gap-2 mb-4 text-muted-foreground">
                  <MapPinOff className="w-4 h-4" /> Zones d'ombre
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tendances.filter(t => t.territoireInexplore).map(t => (
                    <span key={t.valeur} className="bg-muted/50 border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-full">
                      {t.valeur}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pt-12 pb-8">
          <Button variant="outline" size="lg" onClick={() => setLocation(`/session/${sessionId}/collisions`)}>
            Retourner explorer
          </Button>
        </div>

        <Dialog
          open={selectedObservation != null}
          onOpenChange={(open) => {
            if (!open) setSelectedObservation(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pourquoi cette observation?</DialogTitle>
              <DialogDescription>
                Cette tendance est calculée uniquement à partir des réponses ci-dessous.
                Elle sera recalculée si une réponse est corrigée ou supprimée.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedObservation &&
                responses
                  .filter((response) =>
                    selectedObservation.reponsesSources.includes(response.id),
                  )
                  .map((response) => (
                    <article key={response.id} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-primary">
                          {response.contexte ?? "Contexte non précisé"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Réponse {response.id}, version {response.version}
                        </span>
                      </div>
                      <p className="leading-relaxed">{response.texteDilemme}</p>
                      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Choix</dt>
                          <dd className="font-medium">
                            {response.choix === "A"
                              ? response.valeurA
                              : response.choix === "B"
                                ? response.valeurB
                                : response.choix === "ca_depend"
                                  ? "Ça dépend"
                                  : response.choix === "je_ne_sais_pas"
                                    ? "Je ne sais pas"
                                    : "Question passée"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Difficulté</dt>
                          <dd>{response.difficulte ? `${response.difficulte}/5` : "Non demandée"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Certitude</dt>
                          <dd>{response.certitude ? `${response.certitude}/5` : "Non demandée"}</dd>
                        </div>
                      </dl>
                      {response.choix === "ca_depend" && (
                        <p className="text-sm text-muted-foreground">
                          Facteur indiqué : {response.facteurDependLibre || response.facteurDepend || "non précisé"}
                        </p>
                      )}
                      {response.pivotDimension && (
                        <p className="text-sm text-muted-foreground">
                          Dimension variée dans cette reprise : {response.pivotDimension}
                        </p>
                      )}
                      {editingResponse?.id === response.id ? (
                        <form onSubmit={submitCorrection} className="border-t border-border pt-4 space-y-4">
                          <div>
                            <label htmlFor={`choice-${response.id}`} className="text-sm font-medium">Choix corrigé</label>
                            <select
                              id={`choice-${response.id}`}
                              value={draftChoice}
                              onChange={(event) => setDraftChoice(event.target.value as ReponseCollisionUpdateChoix)}
                              className="mt-1 w-full min-h-11 rounded-md border border-input bg-background px-3"
                            >
                              <option value="A">{response.valeurA}</option>
                              <option value="B">{response.valeurB}</option>
                              <option value="ca_depend">Ça dépend</option>
                              <option value="je_ne_sais_pas">Je ne sais pas</option>
                              <option value="passer">Passer</option>
                            </select>
                          </div>
                          {draftChoice === "ca_depend" && (
                            <div>
                              <label htmlFor={`factor-${response.id}`} className="text-sm font-medium">Facteur principal</label>
                              <select
                                id={`factor-${response.id}`}
                                value={draftFactor}
                                onChange={(event) => setDraftFactor(event.target.value)}
                                className="mt-1 w-full min-h-11 rounded-md border border-input bg-background px-3"
                              >
                                <option value="cout_personnel">Coût personnel</option>
                                <option value="ampleur_impact">Importance de la conséquence</option>
                                <option value="proximite_sociale">Proximité sociale</option>
                                <option value="nombre_personnes">Portée / personnes touchées</option>
                                <option value="certitude">Certitude</option>
                                <option value="reversibilite">Réversibilité</option>
                                <option value="urgence">Urgence</option>
                                <option value="responsabilite">Responsabilité</option>
                              </select>
                            </div>
                          )}
                          {draftChoice !== "passer" && (
                            <div className="grid grid-cols-2 gap-3">
                              <label className="text-sm font-medium">
                                Difficulté
                                <select
                                  value={draftDifficulty}
                                  onChange={(event) => setDraftDifficulty(Number(event.target.value))}
                                  className="mt-1 w-full min-h-11 rounded-md border border-input bg-background px-3"
                                >
                                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
                                </select>
                              </label>
                              <label className="text-sm font-medium">
                                Certitude
                                <select
                                  value={draftConfidence}
                                  onChange={(event) => setDraftConfidence(Number(event.target.value))}
                                  className="mt-1 w-full min-h-11 rounded-md border border-input bg-background px-3"
                                >
                                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
                                </select>
                              </label>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={updateResponse.isPending}>Enregistrer la correction</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingResponse(null)}>Annuler</Button>
                          </div>
                        </form>
                      ) : (
                        <Button type="button" variant="ghost" size="sm" onClick={() => startCorrection(response)}>
                          Corriger cette réponse
                        </Button>
                      )}
                    </article>
                  ))}
              {selectedObservation &&
                selectedObservation.reponsesSources.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cette observation décrit une absence de données; aucune réponse précise ne l’appuie encore.
                  </p>
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
