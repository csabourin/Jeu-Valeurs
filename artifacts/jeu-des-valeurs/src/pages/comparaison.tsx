import { FormEvent, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  getGetConstellationQueryKey,
  useGetConstellation,
  type Constellation,
  type TendanceValeur,
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Users,
} from "lucide-react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LigneComparaison = {
  valeur: string;
  moi: number;
  autre: number;
  ecart: number;
};

function lignesCommunes(
  moi: Constellation,
  autre: Constellation,
): LigneComparaison[] {
  const index = new Map(
    autre.tendances
      .filter((t) => !t.territoireInexplore)
      .map((t) => [t.valeur, t]),
  );

  return moi.tendances
    .filter((t) => !t.territoireInexplore && index.has(t.valeur))
    .map((t) => {
      const correspondante = index.get(t.valeur)!;
      return {
        valeur: t.valeur,
        moi: t.scoreNet,
        autre: correspondante.scoreNet,
        ecart: Math.abs(t.scoreNet - correspondante.scoreNet),
      };
    });
}

function valeursFortes(tendances: TendanceValeur[]) {
  return tendances
    .filter((t) => !t.territoireInexplore)
    .sort((a, b) => b.scoreNet - a.scoreNet)
    .slice(0, 5);
}

export default function Comparaison() {
  const { sessionId, autreSessionId } = useParams<{
    sessionId: string;
    autreSessionId?: string;
  }>();
  const [, setLocation] = useLocation();
  const [saisie, setSaisie] = useState(autreSessionId ?? "");
  const [cible, setCible] = useState(autreSessionId ?? "");
  const [copie, setCopie] = useState(false);

  const { data: moi, isLoading: chargeMoi } = useGetConstellation(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetConstellationQueryKey(sessionId),
    },
  });

  const {
    data: autre,
    isLoading: chargeAutre,
    isError: autreInvalide,
  } = useGetConstellation(cible, {
    query: {
      enabled: cible.length > 0 && cible !== sessionId,
      retry: false,
      queryKey: getGetConstellationQueryKey(cible),
    },
  });

  const comparaison = useMemo(() => {
    if (!moi || !autre) return null;
    const lignes = lignesCommunes(moi, autre);
    const proximite =
      lignes.length === 0
        ? null
        : Math.round(
            (lignes.reduce((total, ligne) => total + (1 - ligne.ecart / 2), 0) /
              lignes.length) *
              100,
          );

    return {
      lignes,
      proximite,
      accords: [...lignes]
        .filter((ligne) => ligne.ecart <= 0.35)
        .sort((a, b) => a.ecart - b.ecart)
        .slice(0, 5),
      contrastes: [...lignes]
        .filter((ligne) => ligne.ecart >= 0.55)
        .sort((a, b) => b.ecart - a.ecart)
        .slice(0, 5),
    };
  }, [moi, autre]);

  const comparer = (event: FormEvent) => {
    event.preventDefault();
    const code = saisie.trim();
    if (!code || code === sessionId) return;
    setCible(code);
    setLocation(`/session/${sessionId}/comparer/${code}`);
  };

  const copier = async () => {
    await navigator.clipboard.writeText(sessionId);
    setCopie(true);
    window.setTimeout(() => setCopie(false), 1800);
  };

  if (chargeMoi || !moi) {
    return (
      <Shell sessionId={sessionId} etape="constellation">
        <div className="flex-1 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  const assezDeMatiere = (comparaison?.lignes.length ?? 0) >= 3;

  return (
    <Shell sessionId={sessionId} etape="constellation">
      <div className="max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-500">
        <header className="space-y-4 max-w-3xl">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-4 text-muted-foreground"
            onClick={() => setLocation(`/session/${sessionId}/constellation`)}
          >
            <ArrowLeft className="size-4 mr-2" /> Mon portrait
          </Button>
          <p className="eyebrow">
            <Users className="size-4" /> À deux
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold">
            Où vos valeurs se rencontrent-elles ?
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            La proximité ci-dessous compare uniquement l'ordre observé dans vos
            choix communs. Elle ouvre une conversation; elle ne mesure pas votre
            compatibilité.
          </p>
        </header>

        <section className="comparison-invite">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Mon code privé</p>
            <p className="text-sm text-muted-foreground">
              Envoie ce code à une personne de confiance. Il donne accès à ton
              portrait.
            </p>
          </div>
          <div className="code-chip">
            <code>{sessionId}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={copier}
              aria-label="Copier mon code"
            >
              {copie ? (
                <Check className="size-4 text-secondary" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <form onSubmit={comparer} className="comparison-form">
            <Input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Colle ici le code de l'autre personne"
              aria-label="Code de l'autre portrait"
            />
            <Button
              type="submit"
              disabled={!saisie.trim() || saisie.trim() === sessionId}
            >
              Comparer
            </Button>
          </form>
          {autreInvalide && (
            <p className="text-sm text-destructive">
              Ce code ne correspond pas à un portrait accessible. Vérifie qu'il
              est complet.
            </p>
          )}
        </section>

        {chargeAutre && (
          <div className="py-14 grid place-items-center gap-3 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary" />
            On rapproche vos choix…
          </div>
        )}

        {autre && comparaison && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <section className="similarity-card">
              <div
                className="similarity-ring"
                style={
                  {
                    "--score": comparaison.proximite ?? 0,
                  } as React.CSSProperties
                }
              >
                <strong>
                  {assezDeMatiere ? `${comparaison.proximite} %` : "—"}
                </strong>
                <span>de proximité</span>
              </div>
              <div className="space-y-3">
                <p className="eyebrow">Lecture commune</p>
                <h2 className="text-3xl font-serif font-semibold">
                  {assezDeMatiere
                    ? comparaison.proximite! >= 75
                      ? "Vos priorités prennent souvent la même direction."
                      : comparaison.proximite! >= 50
                        ? "Vous partagez des repères, avec quelques contrastes."
                        : "Vos contrastes peuvent nourrir une vraie conversation."
                    : "Il faut davantage de valeurs communes pour comparer."}
                </h2>
                <p className="text-muted-foreground">
                  Comparaison fondée sur {comparaison.lignes.length} valeur
                  {comparaison.lignes.length > 1 ? "s" : ""} mise
                  {comparaison.lignes.length > 1 ? "s" : ""} à l'épreuve des
                  deux côtés.
                </p>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="comparison-list comparison-list-agree">
                <div className="comparison-list-title">
                  <Check className="size-5" />
                  <div>
                    <h2>Vos points de rencontre</h2>
                    <p>Ce qui occupe une place proche.</p>
                  </div>
                </div>
                {comparaison.accords.length > 0 ? (
                  <ul>
                    {comparaison.accords.map((ligne) => (
                      <li key={ligne.valeur}>{ligne.valeur}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-70">
                    Pas encore assez de réponses semblables.
                  </p>
                )}
              </section>
              <section className="comparison-list comparison-list-talk">
                <div className="comparison-list-title">
                  <MessageCircle className="size-5" />
                  <div>
                    <h2>Vos sujets de discussion</h2>
                    <p>Ce qui n'a pas pris la même place.</p>
                  </div>
                </div>
                {comparaison.contrastes.length > 0 ? (
                  <ul>
                    {comparaison.contrastes.map((ligne) => (
                      <li key={ligne.valeur}>{ligne.valeur}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-70">
                    Aucun contraste net dans vos réponses communes.
                  </p>
                )}
              </section>
            </div>

            <section className="grid md:grid-cols-2 gap-4">
              <PortraitCompact
                titre="Mes valeurs qui passent devant"
                tendances={valeursFortes(moi.tendances)}
              />
              <PortraitCompact
                titre="Ses valeurs qui passent devant"
                tendances={valeursFortes(autre.tendances)}
              />
            </section>

            <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto">
              Deux scores proches ne veulent pas forcément dire que vous donnez
              le même sens aux mots. Le meilleur résultat reste la discussion
              qu'ils déclenchent.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}

function PortraitCompact({
  titre,
  tendances,
}: {
  titre: string;
  tendances: TendanceValeur[];
}) {
  return (
    <div className="compact-profile">
      <h2>{titre}</h2>
      <ol>
        {tendances.map((tendance, index) => (
          <li key={tendance.valeur}>
            <span>{index + 1}</span>
            <strong>{tendance.valeur}</strong>
            <i
              style={{
                width: `${Math.max(8, ((tendance.scoreNet + 1) / 2) * 100)}%`,
              }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
