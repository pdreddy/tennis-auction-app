import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme";

export default function Index() {
  const { token, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.center} testID="boot-loading">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return <Redirect href={token ? "/session" : "/login"} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
