/**
 * app/(app)/profile/documents.tsx — la vérification d'identité, passée au
 * système (phase F).
 *
 * Écran hérité (§5.2). Quatre corrections en chemin.
 *
 * ── 🔴 Le numéro de pièce ne pouvait pas être effacé ────────────────────────
 *
 *     value={docNumber || (selectedDoc?.doc_number ?? "")}
 *
 * Un champ contrôlé dont la valeur retombe sur celle du serveur **dès que la
 * saisie locale est vide**. Effacer le numéro le faisait donc réapparaître
 * sous le doigt, caractère par caractère, jusqu'au dernier — et une pièce dont
 * le numéro avait été mal saisi ne pouvait plus être corrigée que par
 * substitution complète.
 *
 * L'état est maintenant **amorcé** au changement de type de pièce, et plus
 * jamais recalculé : ce que l'on voit est ce que l'on a tapé.
 *
 * ── 🔴 Deux types de pièce sur quatre étaient inaccessibles sur Android ─────
 *
 * `Select` empilait ses options dans les boutons d'une `Alert.alert`, qui n'en
 * accepte que trois sur Android. Corrigé dans le composant — voir son en-tête.
 *
 * ── Aucun retour à l'écran ──────────────────────────────────────────────────
 *
 * Même défaut que les deux écrans `/etat/` : un `headerLeft` posé sur un
 * en-tête masqué par `app/(app)/_layout.tsx`.
 *
 * ── L'appareil photo était le seul chemin ───────────────────────────────────
 *
 * `pickImage` demandait la permission caméra et n'ouvrait que la caméra. Une
 * permission refusée menait à une alerte, puis à rien : la pièce était
 * impossible à transmettre. Or beaucoup de membres ont **déjà** la photo de
 * leur carte dans leur galerie. Les deux chemins sont maintenant proposés.
 *
 * ── Ce que l'écran dit de plus ──────────────────────────────────────────────
 *
 * `submitted_at`, servi par le sérialiseur et absent du type jusqu'ici, répond
 * à la seule question que se pose un membre dont la pièce est « en attente » :
 * depuis quand.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
} from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Select, type SelectOption } from "@/components/ui/Select";
import { ApiError, estPanneReseau, messageApi } from "@/lib/api";
import { AuthService } from "@/lib/auth.service";
import { fichierPourEnvoi } from "@/lib/upload";
import { invalidateDocumentCount } from "@/hooks/useProfileCompletion";
import { useAuthStore } from "@/store/auth.store";
import type { DocumentStatus, UserDocument } from "@/types";
import {
  Border,
  GUTTER,
  Ink,
  Radius,
  Space,
  Status,
  Surface,
  Type,
  UIType,
  Violet,
  continuous,
} from "@/theme";

const DOC_TYPES: SelectOption[] = [
  { value: "national_id", label: "Carte nationale d'identité" },
  { value: "passport", label: "Passeport" },
  { value: "voter_id", label: "Carte d'électeur" },
  { value: "driver_license", label: "Permis de conduire" },
];

const STATUS_META: Record<
  DocumentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  validated: {
    label: "Validé",
    color: Status.success,
    icon: <CheckCircle2 size={16} color={Status.success} strokeWidth={1.75} />,
  },
  rejected: {
    label: "Rejeté",
    color: Status.error,
    icon: <AlertCircle size={16} color={Status.error} strokeWidth={1.75} />,
  },
  pending: {
    label: "En attente de validation",
    color: Status.warning,
    icon: <Clock size={16} color={Status.warning} strokeWidth={1.75} />,
  },
};

function formatDate(raw?: string | null) {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Side = "recto" | "verso";

export default function DocumentsScreen() {
  const router = useRouter();
  /**
   * L'identifiant seul, pas l'objet. Le React Compiler infère `user` comme
   * dépendance quand un effet ou un rappel écrit `user?.id` ; le sélecteur le
   * réduit à la source, ce qui garde la mémoïsation intacte — même piège que
   * celui rencontré deux fois en phase D.
   */
  const userId = useAuthStore((state) => state.user?.id);

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [docType, setDocType] = useState("national_id");
  const [docNumber, setDocNumber] = useState("");
  const [rectoUri, setRectoUri] = useState<string | null>(null);
  const [versoUri, setVersoUri] = useState<string | null>(null);

  const byType = useMemo(() => {
    const map = new Map<string, UserDocument>();
    for (const document of documents) map.set(document.doc_type, document);
    return map;
  }, [documents]);

  const current = byType.get(docType);

  const load = useCallback(async (id: number) => {
    try {
      setDocuments(await AuthService.getMyDocuments(id));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    AuthService.getMyDocuments(userId)
      .then((data) => {
        if (active) {
          setDocuments(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  /**
   * Amorçage au changement de type — et **uniquement** là. Le champ reste
   * ensuite entièrement à la main de la saisie, effacement compris.
   */
  const selectType = useCallback(
    (next: string) => {
      setDocType(next);
      setDocNumber(byType.get(next)?.doc_number ?? "");
      setRectoUri(null);
      setVersoUri(null);
    },
    [byType],
  );

  const capture = useCallback(async (side: Side, source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        "Permission refusée",
        source === "camera"
          ? "L'accès à l'appareil photo est nécessaire pour photographier la pièce. Vous pouvez aussi la choisir dans votre galerie."
          : "L'accès à vos photos est nécessaire pour choisir une image.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.7,
          });

    if (result.canceled) return;
    const uri = result.assets[0].uri;
    if (side === "recto") setRectoUri(uri);
    else setVersoUri(uri);
  }, []);

  const submit = useCallback(async () => {
    if (!userId) return;
    if (!rectoUri && !current?.image) {
      Alert.alert("Photo manquante", "Le recto de la pièce est obligatoire.");
      return;
    }

    setSubmitting(true);

    /*
      ⚠ TOUT ceci doit rester DANS le `try`.
      Lire la pièce jointe peut échouer — photo supprimée entre le choix et
      l'envoi, cache vidé par Android (voir `lib/upload.ts`). Construit dehors,
      cet échec sautait par-dessus le `catch` ET par-dessus le `finally` : le
      bouton restait bloqué sur « Envoi… », sans rien afficher, jusqu'au
      redémarrage de l'application.
    */
    try {
      const form = new FormData();
      form.append("doc_type", docType);
      /**
       * Le champ est envoyé même vide : c'est ainsi qu'un numéro mal saisi peut
       * être effacé côté serveur. Ne l'omettre que s'il n'a jamais été rempli.
       */
      if (docNumber.trim() || current?.doc_number) {
        form.append("doc_number", docNumber.trim());
      }

      /* La forme d'une pièce jointe est décidée à UN seul endroit — voir
         `lib/upload.ts`, qui explique pourquoi elle a changé au SDK 56. */
      const attach = (field: string, uri: string) => {
        form.append(field, fichierPourEnvoi(uri) as unknown as Blob);
      };

      if (rectoUri) attach("image", rectoUri);
      if (versoUri) attach("image_verso", versoUri);

      let updated: UserDocument;
      try {
        updated = current
          ? await AuthService.updateDocument(userId, current.id, form)
          : await AuthService.uploadDocument(userId, form);
      } catch (erreur) {
        /*
          ═══════════════════════════════════════════════════════════════════
          🔴 LE CAS QUI ENFERMAIT LE MEMBRE DANS UNE BOUCLE
          ═══════════════════════════════════════════════════════════════════
          `current` vient de la liste chargée au montage. Si CE chargement a
          échoué — et sur la route Dakar ↔ VPS il échoue régulièrement — l'écran
          croit qu'aucune pièce n'existe et POSTe au lieu de PATCHer. Le serveur
          refuse : `unique_together('user', 'doc_type')`.

          Avant, ce refus était un 500 (voir `accounts/views.py`,
          `perform_create`) rattrapé ici par un « vérifiez votre connexion » —
          un conseil faux, qui faisait recommencer à l'identique, indéfiniment.

          Le serveur nomme désormais le conflit ET rend l'identifiant de la
          pièce existante. On n'a donc pas besoin de recharger la liste (c'est
          justement ce qui avait échoué) : on rejoue l'envoi en CORRECTION sur
          cet identifiant. Le membre ne voit qu'une chose — sa pièce est passée.
        */
        const idExistant =
          erreur instanceof ApiError && erreur.status === 400
            ? Number((erreur.payload as Record<string, unknown> | undefined)?.document_id)
            : NaN;

        if (!current && Number.isFinite(idExistant) && idExistant > 0) {
          updated = await AuthService.updateDocument(userId, idExistant, form);
        } else {
          throw erreur;
        }
      }

      setDocuments((previous) => [
        updated,
        ...previous.filter((item) => item.doc_type !== updated.doc_type),
      ]);
      setFailed(false);
      setRectoUri(null);
      setVersoUri(null);
      /* Le bandeau « Profil incomplet » compte les pièces : sans cela il
         resterait affiché jusqu'au prochain démarrage. */
      invalidateDocumentCount();
      Alert.alert("Document transmis", "Votre pièce est en attente de validation.");
    } catch (erreur) {
      /*
        On dit CE QUI s'est passé. `estPanneReseau` sépare les deux seuls cas
        qui appellent des conseils différents : soit `fetch` n'a jamais eu de
        réponse — et là, parler de connexion est juste —, soit le serveur a
        répondu et c'est SON message qu'il faut montrer. Voir `lib/api.ts`.
      */
      Alert.alert(
        "Envoi impossible",
        estPanneReseau(erreur)
          ? "La pièce n'a pas pu être transmise. Vérifiez votre connexion et réessayez."
          : messageApi(erreur, "La pièce n'a pas pu être transmise."),
      );
    } finally {
      setSubmitting(false);
    }
  }, [current, docNumber, docType, rectoUri, userId, versoUri]);

  const status = current ? STATUS_META[current.status] : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader title="Mes documents" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Une pièce d&apos;identité validée ouvre l&apos;accès aux Jëfs pour un
          tiers et à la reprise de compte. Elle n&apos;est visible que de
          l&apos;administration.
        </Text>

        {failed ? (
          <ErrorState
            body="Vos documents n'ont pas pu être chargés."
            onRetry={userId ? () => load(userId) : undefined}
          />
        ) : null}

        <Card style={styles.form}>
          <Select
            label="Type de pièce"
            value={docType}
            options={DOC_TYPES}
            onSelect={selectType}
          />
          <Input
            label="Numéro de pièce (facultatif)"
            value={docNumber}
            onChangeText={setDocNumber}
            placeholder="Tel qu'il figure sur la pièce"
            autoCapitalize="characters"
          />
        </Card>

        <View style={styles.sides}>
          <SidePicker
            title="Recto"
            required
            uri={rectoUri ?? current?.image ?? null}
            onCapture={(source) => capture("recto", source)}
          />
          <SidePicker
            title="Verso"
            uri={versoUri ?? current?.image_verso ?? null}
            onCapture={(source) => capture("verso", source)}
          />
        </View>

        {current && status ? (
          <Card tone="alt" style={styles.status}>
            <View style={styles.statusRow}>
              {status.icon}
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
            {formatDate(current.submitted_at) ? (
              <Text style={styles.statusMeta}>
                Transmise le {formatDate(current.submitted_at)}
              </Text>
            ) : null}
            {current.status === "rejected" && current.rejection_note ? (
              <Text style={styles.rejection}>{current.rejection_note}</Text>
            ) : null}
          </Card>
        ) : null}

        <Button
          label={current ? "Mettre à jour la pièce" : "Envoyer la pièce"}
          onPress={submit}
          loading={submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SidePicker({
  title,
  uri,
  required = false,
  onCapture,
}: {
  title: string;
  uri: string | null;
  required?: boolean;
  onCapture: (source: "camera" | "library") => void;
}) {
  return (
    <View style={styles.side}>
      <Text style={styles.sideTitle}>
        {title}
        {required ? <Text style={styles.requiredMark}> ·  obligatoire</Text> : null}
      </Text>

      <View style={styles.preview}>
        {uri ? (
          <ExpoImage source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.previewEmpty}>
            <Camera size={22} color={Ink[300]} strokeWidth={1.5} />
          </View>
        )}
      </View>

      <View style={styles.sideActions}>
        <Button
          label="Photo"
          variant="secondary"
          size="md"
          icon={<Camera size={15} color={Ink[900]} strokeWidth={1.75} />}
          onPress={() => onCapture("camera")}
          style={styles.sideAction}
        />
        <Button
          label="Galerie"
          variant="outline"
          size="md"
          icon={<ImagePlus size={15} color={Violet[900]} strokeWidth={1.75} />}
          onPress={() => onCapture("library")}
          style={styles.sideAction}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Surface.default },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingTop: Space.sm,
    paddingBottom: Space.huge,
    gap: Space.lg,
  },
  lead: { ...Type.body, color: Ink[500] },
  form: { gap: Space.lg },

  sides: { flexDirection: "row", gap: Space.md },
  side: { flex: 1, gap: Space.sm },
  sideTitle: { ...UIType.chipLabel, color: Ink[900] },
  requiredMark: { ...Type.micro, color: Ink[300] },
  preview: {
    aspectRatio: 1.6,
    borderRadius: Radius.input,
    ...continuous,
    overflow: "hidden",
    backgroundColor: Surface.alt,
    borderWidth: 1,
    borderColor: Border.hairline,
  },
  previewEmpty: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  sideActions: { gap: Space.xs },
  sideAction: { paddingHorizontal: Space.sm },

  status: { gap: Space.xs },
  statusRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  statusLabel: { ...UIType.rowTitle },
  statusMeta: { ...Type.micro, color: Ink[300] },
  rejection: { ...Type.body, color: Status.error, marginTop: Space.xs },
});
