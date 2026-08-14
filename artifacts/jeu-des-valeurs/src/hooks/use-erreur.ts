import { useToast } from "@/hooks/use-toast";

/**
 * Signale l'échec d'une mutation à l'écran.
 *
 * Sans ça, une requête en échec laisse un bouton qui ne fait rien : la personne
 * clique, il ne se passe rien, et il n'existe aucune trace visible de la cause.
 * À brancher sur le `onError` de toute mutation dont dépend la suite du jeu.
 */
export function useSignalerErreur(): (titre: string) => (erreur: Error) => void {
  const { toast } = useToast();
  return (titre: string) => (erreur: Error) => {
    toast({
      title: titre,
      description: erreur.message,
      variant: "destructive",
    });
  };
}
