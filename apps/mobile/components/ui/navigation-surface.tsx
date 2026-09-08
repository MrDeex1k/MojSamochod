import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";

export function useNavigationMaterial() {
  const [supported] = useState(
    () => Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable(),
  );
  const [preferences, setPreferences] = useState({ transparent: false, interactive: false });

  useEffect(() => {
    if (!supported) return;
    let active = true;
    let revision = 0;
    const refresh = () => {
      const current = ++revision;
      void Promise.all([
        AccessibilityInfo.isReduceTransparencyEnabled(),
        AccessibilityInfo.isDarkerSystemColorsEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
      ]).then(
        ([reduceTransparency, increaseContrast, reduceMotion]) => {
          if (active && current === revision) {
            setPreferences({
              transparent: !reduceTransparency && !increaseContrast,
              interactive: !reduceMotion,
            });
          }
        },
        () => {
          if (active && current === revision) {
            setPreferences({ transparent: false, interactive: false });
          }
        },
      );
    };
    const subscriptions = [
      AccessibilityInfo.addEventListener("reduceTransparencyChanged", refresh),
      AccessibilityInfo.addEventListener("darkerSystemColorsChanged", refresh),
      AccessibilityInfo.addEventListener("reduceMotionChanged", refresh),
      AppState.addEventListener("change", (state) => {
        if (state === "active") refresh();
      }),
    ];
    refresh();
    return () => {
      active = false;
      revision++;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [supported]);

  return {
    supported,
    glass: supported && preferences.transparent,
    interactive: preferences.interactive,
  };
}

export type NavigationMaterial = ReturnType<typeof useNavigationMaterial>;

export function NavigationSurface({
  material,
  children,
  style,
  ...props
}: ViewProps & { material: NavigationMaterial }) {
  return (
    <View {...props} style={[styles.surface, style]}>
      {/* Keep controls mounted when accessibility settings change; never fade the glass parent. */}
      {material.glass ? (
        <GlassView
          testID="navigation-glass"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          colorScheme="dark"
          glassEffectStyle="regular"
          isInteractive={material.interactive}
          style={[StyleSheet.absoluteFill, styles.surface]}
        />
      ) : (
        <View
          testID="navigation-opaque"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.surface, styles.opaque]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { borderRadius: 28 },
  opaque: { backgroundColor: "#252527", borderWidth: 1, borderColor: "#343438" },
});
