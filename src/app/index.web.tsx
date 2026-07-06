import { useRef } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";

import { Compare } from "@/components/landing/compare";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { LandlordBand } from "@/components/landing/landlord-band";
import { NavBar, type LandingSection } from "@/components/landing/nav-bar";
import { Steps } from "@/components/landing/steps";
import { palette } from "@/constants/theme";

/** Web landing — design 1a (desktop) / 1b (mobile) with the revised deposit-trust copy. */
export default function Landing() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<LandingSection, number>>>({});

  const scrollTo = (section: LandingSection) => {
    const y = sectionY.current[section];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  const track = (section: LandingSection) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[section] = e.nativeEvent.layout.y;
  };

  return (
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ width: "100%", maxWidth: 1280, alignSelf: "center" }}>
        <NavBar isDesktop={isDesktop} onNav={scrollTo} />
        <Hero isDesktop={isDesktop} />
        <View onLayout={track("how")}>
          <Steps isDesktop={isDesktop} />
        </View>
        <View onLayout={track("safe")}>
          <Compare isDesktop={isDesktop} />
        </View>
        <View onLayout={track("landlords")}>
          <LandlordBand isDesktop={isDesktop} />
        </View>
        <Footer isDesktop={isDesktop} />
      </View>
    </ScrollView>
  );
}
