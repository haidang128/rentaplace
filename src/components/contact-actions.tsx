import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getLandlordPhone } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * Call / WhatsApp buttons for a landlord. The number is revealed only to
 * signed-in users (getLandlordPhone is a signed-in-only RPC), so nothing
 * renders for anonymous visitors or when the landlord hasn't added a number.
 */
export function ContactActions({ landlordId }: { landlordId: string }) {
  const { t } = useLang();
  const { session } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setPhone(null);
      return;
    }
    let alive = true;
    getLandlordPhone(landlordId).then((p) => {
      if (alive) setPhone(p);
    });
    return () => {
      alive = false;
    };
  }, [session, landlordId]);

  if (!session || !phone) return null;

  const dial = phone.replace(/[^\d+]/g, "");
  const waNumber = phone.replace(/\D/g, "");

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <ContactButton
        label={t("listing.callLandlord")}
        icon="📞"
        onPress={() => Linking.openURL(`tel:${dial}`)}
      />
      <ContactButton
        label={t("listing.whatsapp")}
        icon="💬"
        tone="green"
        onPress={() => Linking.openURL(`https://wa.me/${waNumber}`)}
      />
    </View>
  );
}

function ContactButton({
  label,
  icon,
  onPress,
  tone = "outline",
}: {
  label: string;
  icon: string;
  onPress: () => void;
  tone?: "outline" | "green";
}) {
  const isGreen = tone === "green";
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: radius.field,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderColor: isGreen ? palette.green : palette.brick,
        backgroundColor: isGreen ? palette.green : "#fff",
      }}
    >
      <Text style={{ fontSize: 15 }}>{icon}</Text>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: isGreen ? "#fff" : palette.brick }}>
        {label}
      </Text>
    </Pressable>
  );
}
