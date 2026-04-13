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
  PencilLine,
  KeyRound,
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";

import { Colors } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/auth.store";

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
    detail: "Annonces, dons et campagnes",
    icon: Bell,
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, isLoading } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.first_name, user?.last_name, user?.phone]);

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
      });
      Alert.alert("Profil mis à jour", "Vos informations ont bien été enregistrées.");
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le profil pour le moment.");
    }
  };

  const avatarSource = user?.avatar_url ? { uri: user.avatar_url } : null;

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
        <GlassCard style={styles.accountCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              {avatarSource ? (
                <ExpoImage source={avatarSource} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <>
                  <UserCircle2 size={34} color={Colors.accent.DEFAULT} />
                  <Text style={styles.avatarText}>{initials}</Text>
                </>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {user ? `${user.first_name} ${user.last_name}` : "Membre Yessal"}
              </Text>
              <Text style={styles.role}>
                {user?.role ?? "Compte membre"} · {user?.status ?? "Statut inconnu"}
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

        <Text style={styles.sectionLabel}>Modifier le profil</Text>
        <GlassCard style={styles.formCard}>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
          <Input label="Nom" value={lastName} onChangeText={setLastName} />
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+221 ..."
          />

          <View style={styles.formActions}>
            <Button
              label="Enregistrer"
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
              <Text style={styles.securityText}>Annonces, dons, campagnes et rappels.</Text>
            </View>
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
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.accent.dim,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarText: {
    color: Colors.accent.DEFAULT,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    position: "absolute",
    bottom: 6,
    right: 8,
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
    marginTop: 4,
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
});
