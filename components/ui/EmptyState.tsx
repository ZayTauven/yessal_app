/**
 * EmptyState et ErrorState.
 *
 * Le brief §4.4 est net : « le vide — avec une illustration et une action,
 * jamais un texte gris seul ». La base de démonstration est presque vide, ces
 * états seront les plus vus de la démonstration client.
 *
 * `EmptyState`  pictogramme 56, titre 17 / 700, action primaire de 48.
 * `ErrorState`  pictogramme 44, titre 15 / 700, action secondaire — c'est la
 *               3G intermittente, pas une impasse : le ton reste bas.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { Ink, Space, Type, UIType } from "@/theme";

interface EmptyStateProps {
  /** Tracé monoline 56 × 56, trait violet-900. */
  picto?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `false` pour poser l'état dans un conteneur qui a déjà son fond. */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  picto,
  title,
  body,
  actionLabel,
  onAction,
  card = true,
  style,
}: EmptyStateProps) {
  const content = (
    <View style={styles.center}>
      {picto}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="md"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );

  if (!card) return <View style={style}>{content}</View>;

  return (
    <Card padded={false} style={[styles.card, style]}>
      {content}
    </Card>
  );
}

interface ErrorStateProps {
  picto?: React.ReactNode;
  title?: string;
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  picto,
  title = "Connexion perdue",
  body,
  onRetry,
  retryLabel = "Réessayer",
  card = true,
  style,
}: ErrorStateProps) {
  const content = (
    <View style={styles.center}>
      {picto}
      <View style={styles.text}>
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      {onRetry ? (
        <Button
          label={retryLabel}
          onPress={onRetry}
          variant="secondary"
          size="md"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );

  if (!card) return <View style={style}>{content}</View>;

  return (
    <Card padded={false} style={[styles.errorCard, style]}>
      {content}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 28, paddingHorizontal: Space.xl },
  errorCard: { minHeight: 200, justifyContent: "center", padding: Space.xl },
  center: { alignItems: "center", gap: 14 },
  text: { gap: 6, alignItems: "center" },
  title: { ...Type.cardTitle, color: Ink[900], textAlign: "center" },
  errorTitle: { ...UIType.rowTitle, color: Ink[900], textAlign: "center" },
  body: {
    ...UIType.stateBody,
    color: Ink[500],
    textAlign: "center",
    maxWidth: 280,
  },
  action: { paddingHorizontal: Space.xxl, height: 48 },
});
