import { ScrollView, useWindowDimensions, View } from "react-native";

import { Compare } from "@/components/landing/compare";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { LandlordBand } from "@/components/landing/landlord-band";
import { NavBar } from "@/components/landing/nav-bar";
import { Steps } from "@/components/landing/steps";
import { palette } from "@/constants/theme";

/** Web landing — design 1a (desktop) / 1b (mobile) with the revised deposit-trust copy. */
export default function Landing() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ width: "100%", maxWidth: 1280, alignSelf: "center" }}>
        <NavBar isDesktop={isDesktop} />
        <Hero isDesktop={isDesktop} />
        <Steps isDesktop={isDesktop} />
        <Compare isDesktop={isDesktop} />
        <LandlordBand isDesktop={isDesktop} />
        <Footer isDesktop={isDesktop} />
      </View>
    </ScrollView>
  );
}
