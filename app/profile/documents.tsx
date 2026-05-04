import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Camera, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { Colors } from "@/constants/colors";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/auth.store";
import { AuthService } from "@/lib/auth.service";
import type { UserDocument } from "@/types";

const DOC_TYPES = [
  { value: "national_id", label: "Carte nationale" },
  { value: "passport", label: "Passeport" },
  { value: "voter_id", label: "Carte d'électeur" },
  { value: "driver_license", label: "Permis de conduire" },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [docType, setDocType] = useState("national_id");
  const [docNumber, setDocNumber] = useState("");
  const [rectoUri, setRectoUri] = useState<string | null>(null);
  const [versoUri, setVersoUri] = useState<string | null>(null);

  const docMap = useMemo(() => {
    const map = new Map<string, UserDocument>();
    for (const d of documents) map.set(d.doc_type, d);
    return map;
  }, [documents]);

  const selectedDoc = docMap.get(docType);

  const loadDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await AuthService.getMyDocuments(user.id);
      setDocuments(data);
    } catch (e) {
      console.warn("Failed to load documents", e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const pickImage = async (type: "recto" | "verso") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "Nous avons besoin de l'accès à la caméra.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      if (type === "recto") setRectoUri(result.assets[0].uri);
      else setVersoUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!rectoUri && !selectedDoc?.image) {
      Alert.alert("Image manquante", "Veuillez prendre une photo du recto.");
      return;
    }

    if (!user?.id) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append("doc_type", docType);
    if (docNumber.trim()) formData.append("doc_number", docNumber.trim());

    if (rectoUri) {
      const filename = rectoUri.split("/").pop();
      formData.append("image", {
        uri: rectoUri,
        name: filename,
        type: "image/jpeg",
      } as any);
    }

    if (versoUri) {
      const filename = versoUri.split("/").pop();
      formData.append("image_verso", {
        uri: versoUri,
        name: filename,
        type: "image/jpeg",
      } as any);
    }

    try {
      let updated: UserDocument;
      if (selectedDoc) {
        updated = await AuthService.updateDocument(user.id, selectedDoc.id, formData);
      } else {
        updated = await AuthService.uploadDocument(user.id, formData);
      }

      setDocuments((prev) => {
        const rest = prev.filter((d) => d.doc_type !== updated.doc_type);
        return [updated, ...rest];
      });
      
      setRectoUri(null);
      setVersoUri(null);
      setDocNumber("");
      Alert.alert("Succès", "Document soumis pour validation.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur", "Échec de l'envoi du document.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "validated": return <CheckCircle2 size={16} color={Colors.status.success} />;
      case "rejected": return <AlertCircle size={16} color={Colors.status.error} />;
      default: return <Clock size={16} color={Colors.accent.DEFAULT} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated": return "Validé";
      case "rejected": return "Rejeté";
      default: return "En attente";
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Mes documents",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={Colors.ink.DEFAULT} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <FileText size={24} color={Colors.accent.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Vérification d&apos;identité</Text>
              <Text style={styles.headerText}>
                Soumettez vos documents pour valider votre profil.
              </Text>
            </View>
          </View>
        </GlassCard>

        <Text style={styles.sectionLabel}>Type de document</Text>
        <GlassCard style={styles.formCard}>
          <Select
            label="Type de pièce"
            value={docType}
            options={DOC_TYPES}
            onSelect={setDocType}
          />
          <Input
            label="Numéro de pièce (Optionnel)"
            value={docNumber || (selectedDoc?.doc_number ?? "")}
            onChangeText={setDocNumber}
            placeholder="Ex: 123456789"
          />
        </GlassCard>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Recto</Text>
            <Pressable style={styles.imagePicker} onPress={() => pickImage("recto")}>
              {(rectoUri || selectedDoc?.image) ? (
                <Image source={{ uri: rectoUri || selectedDoc?.image }} style={styles.preview} />
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <Camera size={24} color={Colors.ink.faint} />
                  <Text style={styles.pickerText}>Prendre photo</Text>
                </View>
              )}
            </Pressable>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Verso</Text>
            <Pressable style={styles.imagePicker} onPress={() => pickImage("verso")}>
              {(versoUri || selectedDoc?.image_verso) ? (
                <Image source={{ uri: versoUri || selectedDoc?.image_verso }} style={styles.preview} />
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <Camera size={24} color={Colors.ink.faint} />
                  <Text style={styles.pickerText}>Prendre photo</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {selectedDoc && (
          <GlassCard style={styles.statusCard}>
            <View style={styles.statusRow}>
              {getStatusIcon(selectedDoc.status)}
              <Text style={styles.statusLabel}>
                Statut : <Text style={styles.statusValue}>{getStatusLabel(selectedDoc.status)}</Text>
              </Text>
            </View>
            {selectedDoc.status === "rejected" && selectedDoc.rejection_note && (
              <Text style={styles.rejectionNote}>{selectedDoc.rejection_note}</Text>
            )}
          </GlassCard>
        )}

        <View style={styles.actions}>
          <Button
            label={selectedDoc ? "Mettre à jour" : "Envoyer le document"}
            onPress={handleUpload}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerCard: {
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.accent.dim,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.DEFAULT,
  },
  headerText: {
    fontSize: 12,
    color: Colors.ink.muted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontFamily: "Inter_700Bold",
    color: Colors.ink.faint,
    marginBottom: 8,
  },
  formCard: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  imagePicker: {
    height: 140,
    borderRadius: 20,
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border.DEFAULT,
    overflow: "hidden",
  },
  pickerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  pickerText: {
    fontSize: 12,
    color: Colors.ink.faint,
    fontFamily: "Inter_600SemiBold",
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  statusCard: {
    padding: 16,
    backgroundColor: Colors.surface.DEFAULT,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.ink.DEFAULT,
  },
  statusValue: {
    color: Colors.accent.DEFAULT,
  },
  rejectionNote: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.status.error,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    marginTop: 10,
    paddingBottom: 40,
  },
});
