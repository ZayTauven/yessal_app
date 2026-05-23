import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  LogOut,
  Mail,
  ShieldCheck,
  UserCircle2,
  Users,
  KeyRound,
  AlertCircle,
  ChevronRight,
  PencilLine,
  FileText,
  Camera,
  Award,
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuthStore } from "@/store/auth.store";
import { AuthService } from "@/lib/auth.service";
import { TitleSelectionModal } from "@/components/profile/TitleSelectionModal";
import type { TitleOption } from "@/types";

const quickActions = [
  {
    title: "Ma tutelle",
    detail: "Gérez vos proches et leurs dons",
    icon: Users,
    route: "/profile/tutelle" as const,
  },
  {
    title: "Sécurité du compte",
    detail: "Mot de passe et sessions",
    icon: ShieldCheck,
    route: "/forgot" as const,
  },
  {
    title: "Notifications",
    detail: "Actualités, Jëfs et Ndiguels",
    icon: Bell,
  },
  {
    title: "Mes documents",
    detail: "Vérification d'identité",
    icon: FileText,
    route: "/profile/documents" as const,
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, isLoading } = useAuthStore();
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  // title may come from backend as a string or object, normalise it:
  const resolvedTitle = typeof user?.title === "object" && user?.title !== null
    ? (user?.title as any)?.name ?? ""
    : (user?.title as string | undefined) ?? "";
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [residenceCountry, setResidenceCountry] = useState(user?.residence_country ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [stateName, setStateName] = useState(user?.state ?? "");
  const [zipCode, setZipCode] = useState(user?.zip_code ?? "");
  const [maritalStatus, setMaritalStatus] = useState(user?.marital_status ?? "");
  const [bloodType, setBloodType] = useState(user?.blood_type ?? "");

  const GENDER_OPTIONS = [
    { label: "Homme", value: "male" },
    { label: "Femme", value: "female" },
  ];

  const MARITAL_OPTIONS = [
    { label: "Célibataire", value: "single" },
    { label: "Marié(e)", value: "married" },
    { label: "Divorcé(e)", value: "divorced" },
    { label: "Veuf/Veuve", value: "widowed" },
  ];

  const BLOOD_OPTIONS = [
    { label: "A+", value: "A+" },
    { label: "A-", value: "A-" },
    { label: "B+", value: "B+" },
    { label: "B-", value: "B-" },
    { label: "AB+", value: "AB+" },
    { label: "AB-", value: "AB-" },
    { label: "O+", value: "O+" },
    { label: "O-", value: "O-" },
  ];

  const isIncomplete = useMemo(() => {
    return !user?.phone || !user?.gender || !user?.city || !user?.birth_date || !user?.blood_type;
  }, [user]);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
    setBirthDate(user?.birth_date ?? "");
    setGender(user?.gender ?? "");
    setResidenceCountry(user?.residence_country ?? "");
    setCity(user?.city ?? "");
    setAddress(user?.address ?? "");
    setStateName(user?.state ?? "");
    setZipCode(user?.zip_code ?? "");
    setMaritalStatus(user?.marital_status ?? "");
    setBloodType(user?.blood_type ?? "");
  }, [user]);

  useEffect(() => {
    AuthService.getTitles().then(setTitles).catch(console.warn);
  }, []);

  const initials = useMemo(
    () => `${user?.first_name?.[0] ?? "Y"}${user?.last_name?.[0] ?? ""}`.toUpperCase(),
    [user?.first_name, user?.last_name],
  );

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment fermer la session ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login" as any);
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        title: resolvedTitle.trim() || null,
        birth_date: birthDate.trim() || null,
        gender: (gender.trim() as any) || null,
        residence_country: residenceCountry.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        state: stateName.trim() || null,
        zip_code: zipCode.trim() || null,
        marital_status: (maritalStatus.trim() as any) || null,
        blood_type: bloodType.trim() || null,
      });
      Alert.alert("Profil mis à jour", "Vos informations ont bien été enregistrées.");
    } catch {
      // error handled by store
    }
  };

  const handleRequestTitle = async (titleId: number) => {
    try {
      await AuthService.submitTitleRequest(titleId);
      Alert.alert(
        "Demande envoyée",
        "Votre demande de changement de titre a été soumise à un administrateur."
      );
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Impossible d'envoyer la demande.";
      Alert.alert("Erreur", msg);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisez l'accès à la galerie pour changer la photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      // Upload immediately
      if (user?.id) {
        setAvatarUploading(true);
        try {
          const formData = new FormData();
          const filename = uri.split("/").pop() ?? "avatar.jpg";
          const ext = filename.split(".").pop() ?? "jpg";
          const mimeType = ext === "png" ? "image/png" : "image/jpeg";
          formData.append("avatar", { uri, name: filename, type: mimeType } as any);
          const updated = await AuthService.updateMe(formData as any);
          // updateProfile in store manually:
          const { user: _u, ...rest } = useAuthStore.getState();
          useAuthStore.setState({ user: updated });
        } catch (e) {
          console.warn("Avatar upload failed:", e);
          Alert.alert("Erreur", "Impossible d'enregistrer la photo pour le moment.");
          setAvatarUri(null);
        } finally {
          setAvatarUploading(false);
        }
      }
    }
  };

  const avatarSource = avatarUri
    ? { uri: avatarUri }
    : user?.avatar_url
    ? { uri: user.avatar_url }
    : user?.avatar
    ? { uri: user.avatar }
    : null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Profil"
        subtitle="Gérez votre compte et vos préférences"
        icon={<UserCircle2 size={24} color="#FFF" />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: 180 }}
      >
        {isIncomplete && (
          <GlassCard style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={styles.alertIcon}>
                <AlertCircle size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Profil incomplet</Text>
                <Text style={styles.alertText}>
                  Complétez vos informations pour faciliter la gestion de vos dons et tutelles.
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
        <GlassCard style={styles.accountCard}>
          {/* Avatar with edit button */}
          <View style={styles.avatarRow}>
            <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {avatarSource ? (
                  <ExpoImage source={avatarSource} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <>
                    <UserCircle2 size={34} color={Colors.accent.DEFAULT} />
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </>
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <Camera size={12} color="#FFF" />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {user ? `${user.first_name} ${user.last_name}` : "Membre Yessal"}
              </Text>
              {resolvedTitle ? (
                <View style={styles.titleChip}>
                  <Award size={12} color={Colors.accent.DEFAULT} />
                  <Text style={styles.titleChipText}>{resolvedTitle}</Text>
                </View>
              ) : null}
              <Text style={styles.role}>
                {user?.role?.replace("_", " ") ?? "Compte membre"} · {user?.status ?? ""}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Mail size={14} color={Colors.accent.DEFAULT} />
              <Text style={styles.metaText}>{user?.email ?? "Email non renseigné"}</Text>
            </View>
            <View style={styles.metaChip}>
              <Users size={14} color={Colors.accent.DEFAULT} />
              <Text style={styles.metaText}>{user?.daara_name ?? user?.daara?.name ?? "Daara lié"}</Text>
            </View>
          </View>
        </GlassCard>

        <Text style={styles.sectionLabel}>Identité et Rôle</Text>
        <GlassCard style={styles.formCard}>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
          <Input label="Nom" value={lastName} onChangeText={setLastName} />
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Titre honorifique"
                value={resolvedTitle || "Aucun titre"}
                editable={false}
                placeholder="Talibé"
              />
            </View>
            <Pressable
              onPress={() => setShowTitleModal(true)}
              style={styles.requestBtn}
            >
              <Text style={styles.requestBtnText}>Changer</Text>
            </Pressable>
          </View>
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+221 ..."
          />
        </GlassCard>

        <Text style={styles.sectionLabel}>Informations personnelles</Text>
        <GlassCard style={styles.formCard}>
          <Input 
            label="Date de naissance" 
            value={birthDate} 
            onChangeText={setBirthDate} 
            placeholder="AAAA-MM-JJ"
          />
          <Select
            label="Genre"
            value={gender}
            options={GENDER_OPTIONS}
            onSelect={setGender}
            placeholder="Sélectionner le genre"
          />
          <Select
            label="Statut marital"
            value={maritalStatus}
            options={MARITAL_OPTIONS}
            onSelect={setMaritalStatus}
            placeholder="Sélectionner le statut"
          />
          <Select
            label="Groupe sanguin"
            value={bloodType}
            options={BLOOD_OPTIONS}
            onSelect={setBloodType}
            placeholder="Sélectionner le groupe"
          />
        </GlassCard>


        <Text style={styles.sectionLabel}>Adresse et Résidence</Text>
        <GlassCard style={styles.formCard}>
          <Input 
            label="Pays de résidence" 
            value={residenceCountry} 
            onChangeText={setResidenceCountry} 
          />
          <Input 
            label="Région / État" 
            value={stateName} 
            onChangeText={setStateName} 
          />
          <Input 
            label="Ville" 
            value={city} 
            onChangeText={setCity} 
          />
          <Input 
            label="Adresse" 
            value={address} 
            onChangeText={setAddress} 
          />
          <Input 
            label="Code postal" 
            value={zipCode} 
            onChangeText={setZipCode} 
          />

          <View style={styles.formActions}>
            <Button
              label="Mettre à jour le profil"
              onPress={handleSave}
              loading={isLoading}
              icon={<PencilLine size={16} color="#fff" />}
            />
          </View>
        </GlassCard>

        <Text style={styles.sectionLabel}>Sécurité et accès</Text>
        <GlassCard style={styles.securityCard}>
          <Pressable
            style={styles.securityRow}
            onPress={() => router.push("/forgot" as any)}
          >
            <View style={styles.securityIcon}>
              <KeyRound size={18} color={Colors.accent.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Réinitialiser le mot de passe</Text>
              <Text style={styles.securityText}>Envoyer un lien de récupération par email.</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.securityRow}
            onPress={() =>
              Alert.alert(
                "Sessions actives",
                "La gestion détaillée des sessions sera branchée plus tard.",
              )
            }
          >
            <View style={styles.securityIcon}>
              <ShieldCheck size={18} color={Colors.accent.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Sessions actives</Text>
              <Text style={styles.securityText}>Voir les connexions et renforcer la sécurité.</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.securityRow}
            onPress={() =>
              Alert.alert(
                "Notifications",
                "Les préférences de notifications seront ajoutées dans une étape suivante.",
              )
            }
          >
            <View style={styles.securityIcon}>
              <Bell size={18} color={Colors.accent.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Préférences de notifications</Text>
              <Text style={styles.securityText}>Actualités, Jëfs, Ndiguels et Rappels.</Text>
            </View>
            <ChevronRight size={18} color={Colors.ink.faint} />
          </Pressable>
        </GlassCard>

        <Text style={styles.sectionLabel}>Accès rapides</Text>
        <View style={styles.list}>
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.title}
                style={styles.listItem}
                onPress={() => {
                  if (item.route) {
                    router.push(item.route);
                  } else {
                    Alert.alert(
                      item.title,
                      "Cette section sera complétée dans un prochain sprint.",
                    );
                  }
                }}
              >
                <View style={styles.listIcon}>
                  <Icon size={18} color={Colors.accent.DEFAULT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDetail}>{item.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button
          label="Se déconnecter"
          onPress={handleLogout}
          icon={<LogOut size={16} color="#fff" />}
        />

        <TitleSelectionModal
          visible={showTitleModal}
          onClose={() => setShowTitleModal(false)}
          titles={titles}
          onSelect={handleRequestTitle}
          currentTitle={user?.title}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.subtle,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 180,
    gap: 14,
  },
  accountCard: {
    padding: 18,
    gap: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.accent.DEFAULT,
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarInitials: {
    color: Colors.accent.DEFAULT,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface.DEFAULT,
  },
  titleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.accent.dim,
    marginTop: 4,
    marginBottom: 2,
  },
  titleChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.accent.DEFAULT,
  },
  name: {
    color: Colors.ink.DEFAULT,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
  },
  role: {
    marginTop: 4,
    color: Colors.ink.muted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.surface.muted,
  },
  metaText: {
    color: Colors.ink.muted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  sectionLabel: {
    marginTop: 6,
    color: Colors.ink.faint,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontFamily: "Inter_700Bold",
  },
  formCard: {
    padding: 18,
    gap: 2,
  },
  formActions: {
    marginTop: 12,
  },
  alertCard: {
    backgroundColor: "#FF9500", // Warm orange for attention
    padding: 16,
    borderRadius: 20,
    borderWidth: 0,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  alertText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  securityCard: {
    padding: 16,
    gap: 12,
  },
  securityRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 6,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    color: Colors.ink.DEFAULT,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  securityText: {
    marginTop: 3,
    color: Colors.ink.muted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    padding: 14,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    color: Colors.ink.DEFAULT,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  itemDetail: {
    marginTop: 3,
    color: Colors.ink.muted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 12,
  },
  requestBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.accent.dim,
    borderRadius: 12,
    marginBottom: 6,
  },
  requestBtnText: {
    color: Colors.accent.DEFAULT,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
