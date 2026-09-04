/**
 * TutelleCard — remplace les « Milestones » de Fundio.
 *
 * Un talibé peut porter un proche : contribuer aux Ndiguels en son nom. La
 * carte montre qui, à quel titre, et ce qui a été versé.
 *
 * Planche « Composants ». Deux points tenus du contrat :
 *
 *   — l'état vide est LE cas majoritaire. Il vit dans `TutelleEmptyState`
 *     ci-dessous, pas dans une note de bas de page ;
 *   — « Petit-neveu maternel » ne se tronque pas. La relation est le seul
 *     champ à casser dans le mot (`overflow-wrap: anywhere` sur la planche) :
 *     un lien de parenté wolof-français est long et doit rester lisible.
 *
 * Montants masqués : le montant cède la place au NOMBRE de Jëfs. On ne cache
 * pas la ligne, on change ce qu'elle dit.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { UserPlus } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatFCFA } from "@/lib/format";
import { Font, Ink, Space, Type, UIType, Violet, montant } from "@/theme";

interface TutelleCardProps {
  name: string;
  relation: string;
  avatarUri?: string | null;
  /** Total versé au nom de cette personne. Ignoré si `amountsHidden`. */
  amount?: number;
  /** Nombre de Jëfs — c'est ce qui s'affiche quand les montants sont masqués. */
  donationCount?: number;
  amountsHidden?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TutelleCard({
  name,
  relation,
  avatarUri,
  amount,
  donationCount,
  amountsHidden = false,
  onPress,
  style,
}: TutelleCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${name}, ${relation}`} style={[styles.card, style]}>
      <Avatar uri={avatarUri} name={name} size={44} />

      <View style={styles.identity}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.relation}>{relation}</Text>
      </View>

      {amountsHidden ? (
        <Text style={styles.count}>
          {donationCount ?? 0} {donationCount === 1 ? "Jëf versé" : "Jëfs versés"}
        </Text>
      ) : amount !== undefined ? (
        <Text style={styles.amount} selectable>
          {formatFCFA(amount)}
        </Text>
      ) : null}
    </Card>
  );
}

/** L'état vide — le cas majoritaire, et le seul chemin vers l'ajout. */
export function TutelleEmptyState({
  onAdd,
  style,
}: {
  onAdd: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <EmptyState
      picto={<UserPlus size={56} color={Violet[900]} strokeWidth={1.5} />}
      title="Vous ne portez personne"
      body="Ajoutez un proche pour contribuer en son nom aux Ndiguels de votre Daara."
      actionLabel="Ajouter une tutelle"
      onAction={onAdd}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: Space.lg, gap: 10 },
  identity: { gap: 2 },
  name: { ...UIType.personName, color: Ink[900] },
  /** Pas de `numberOfLines` : une relation longue se replie, elle ne se coupe pas. */
  relation: { ...Type.label, color: Ink[500] },
  amount: { ...Type.amountCard, color: montant },
  count: { fontFamily: Font.semibold, fontSize: 13, lineHeight: 16, color: Ink[300] },
});
