import { useEffect, useState, type PropsWithChildren } from "react";
import { Image } from "@/components/ui/image";
import {
  Keyboard,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type PressableProps,
} from "react-native";
import {
  NavigationSurface,
  useNavigationMaterial,
  type NavigationMaterial,
} from "@/components/ui/navigation-surface";
import { NavigationInsetContext } from "@/components/layout/navigation-inset";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTranslation } from "@/localization/use-app-translation";
import type { VehicleWorkspaceViewProps } from "./workspace-types";
import { workspaceSection } from "./workspace-data-source";

const icons = {
  history: "M4 5h16M4 12h16M4 19h10",
  fuel: "M5 21V4h10v17M3 21h14M7 7h6v5H7zM15 9h2l3 3v6a1.5 1.5 0 0 1-3 0v-4M18 6l3 3v4",
  documents: "M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6",
  reminders: "M8 3v4M16 3v4M4 9h16M4 5h16v16H4zM8 13h3M8 17h7",
};

type WorkspaceShellProps = Pick<
  VehicleWorkspaceViewProps,
  | "mode"
  | "onFuel"
  | "onDocuments"
  | "onCancelFlow"
  | "onReminders"
  | "onEditVehicle"
  | "onDataManagement"
> & { vehicle: Pick<VehicleWorkspaceViewProps["vehicle"], "make" | "model"> };

export function WorkspaceShell({ children, ...props }: PropsWithChildren<WorkspaceShellProps>) {
  const { t } = useAppTranslation();
  const { width, height } = useWindowDimensions();
  const material = useNavigationMaterial();
  const safeArea = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [navigationHeight, setNavigationHeight] = useState(80);
  const wide = Math.min(width, height) >= 600;
  const section = workspaceSection(props.mode);
  const isSettings = props.mode.kind === "data-management" || props.mode.kind === "vehicle-form";
  const hasBack = !["history", "fuel", "documents", "reminders"].includes(props.mode.kind);
  const floating = material.supported && !wide && !hasBack;
  const navigationInset = floating && !keyboardVisible ? navigationHeight + 16 : 0;
  const onBack =
    props.mode.kind === "vehicle-form" && props.mode.returnTo === "fuel"
      ? props.onFuel
      : section === "documents"
        ? props.onDocuments
        : section === "fuel"
          ? props.onFuel
          : props.onCancelFlow;
  const tabs = [
    { key: "history", label: t("navigation.history"), action: props.onCancelFlow },
    { key: "fuel", label: t("navigation.fuel"), action: props.onFuel },
    { key: "documents", label: t("navigation.documents"), action: props.onDocuments },
    { key: "reminders", label: t("navigation.reminders"), action: props.onReminders },
  ] as const;
  return (
    <ScreenFrame>
      <View className="flex-row items-center justify-between gap-content border-b border-divider px-screen py-compact">
        {hasBack ? (
          <HeaderButton
            material={material}
            accessibilityRole="button"
            accessibilityLabel={t("navigation.back")}
            onPress={onBack}
            className="min-h-12 min-w-12 items-center justify-center"
          >
            <Text className="text-title text-accent">‹</Text>
          </HeaderButton>
        ) : null}
        <View className="flex-1">
          <Text className="text-caption font-semibold uppercase tracking-widest text-secondary">
            {t("common.appName")}
          </Text>
          <Text numberOfLines={1} className="text-heading font-semibold text-primary">
            {props.vehicle.make} {props.vehicle.model}
          </Text>
        </View>
        {!hasBack ? (
          <HeaderButton
            material={material}
            accessibilityRole="button"
            accessibilityLabel={t("workspace.editVehicle")}
            onPress={props.onEditVehicle}
            className="min-h-12 justify-center px-control"
          >
            <Text className="text-body text-accent">{t("navigation.vehicle")}</Text>
          </HeaderButton>
        ) : null}
        {!hasBack ? (
          <HeaderButton
            material={material}
            accessibilityRole="button"
            accessibilityLabel={t("dataManagement.title")}
            onPress={props.onDataManagement}
            className="min-h-12 justify-center px-control"
          >
            <Text className="text-body text-accent">{t("navigation.settings")}</Text>
          </HeaderButton>
        ) : null}
      </View>
      <NavigationInsetContext value={navigationInset}>
        <View style={{ flex: 1 }}>{children}</View>
      </NavigationInsetContext>
      <View
        testID="workspace-navigation"
        onLayout={({ nativeEvent }) => {
          if (nativeEvent.layout.height > 0) setNavigationHeight(nativeEvent.layout.height);
        }}
        accessibilityElementsHidden={keyboardVisible}
        importantForAccessibility={keyboardVisible ? "no-hide-descendants" : "auto"}
        style={[
          floating && {
            position: "absolute",
            bottom: safeArea.bottom,
            left: safeArea.left,
            right: safeArea.right,
          },
          material.supported && { paddingHorizontal: 12, paddingBottom: 8, paddingTop: 8 },
          keyboardVisible && { display: "none" },
        ]}
      >
        <TabSurface material={material}>
          <View
            accessibilityRole="tablist"
            className="flex-row"
            style={[
              { justifyContent: "center" },
              !material.supported && {
                backgroundColor: "#121212",
                borderTopWidth: 1,
                borderColor: "#343438",
              },
            ]}
          >
            {tabs.map(({ key, label, action }) => {
              const selected = !isSettings && section === key;
              const color = selected ? "#72b48e" : "#aab0a7";
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[key]}"/></svg>`;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  onPress={action}
                  className="items-center justify-center gap-compact py-control active:bg-surface-strong"
                  style={{
                    flex: material.supported || !wide ? 1 : undefined,
                    width: !material.supported && wide ? 140 : undefined,
                    minWidth: 0,
                    minHeight: 64,
                    borderRadius: 24,
                    margin: material.supported ? 4 : 0,
                    backgroundColor: selected && material.supported ? "#72b48e24" : "transparent",
                  }}
                >
                  <Image
                    source={{ uri: `data:image/svg+xml;base64,${btoa(svg)}` }}
                    style={{ width: 22, height: 22 }}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text
                    className={`text-caption font-semibold ${selected ? "text-accent" : "text-secondary"}`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </TabSurface>
      </View>
    </ScreenFrame>
  );
}

function HeaderButton({
  material,
  children,
  ...props
}: PressableProps & { material: NavigationMaterial }) {
  const button = (
    <Pressable {...props} style={{ minHeight: 44, borderRadius: 24 }}>
      {children}
    </Pressable>
  );
  return material.supported ? (
    <NavigationSurface material={material}>{button}</NavigationSurface>
  ) : (
    button
  );
}

function TabSurface({ material, children }: PropsWithChildren<{ material: NavigationMaterial }>) {
  return material.supported ? (
    <NavigationSurface
      material={material}
      style={{ width: "100%", maxWidth: 600, alignSelf: "center" }}
    >
      {children}
    </NavigationSurface>
  ) : (
    children
  );
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}
