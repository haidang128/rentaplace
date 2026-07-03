import { Redirect } from "expo-router";

/** Native entry — straight into the app. Web gets the landing (index.web.tsx). */
export default function Index() {
  return <Redirect href="/(tabs)/browse" />;
}
