import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { useAppTranslation } from "@/localization/use-app-translation";
import { Button } from "./button";
import { Image } from "./image";
import { NavigationSurface, useNavigationMaterial } from "./navigation-surface";

type Props = Readonly<{
  name: string;
  page: number;
  count: number;
  imageUri?: string;
  text?: string;
  error: boolean;
  onPage: (page: number) => void;
  onRetry: () => void;
  onClose: () => void;
}>;

export function PdfFullscreen(props: Props) {
  const { t } = useAppTranslation();
  const material = useNavigationMaterial();
  return (
    <Modal
      testID="pdf-fullscreen"
      visible
      animationType="none"
      presentationStyle="fullScreen"
      supportedOrientations={[
        "portrait",
        "portrait-upside-down",
        "landscape-left",
        "landscape-right",
      ]}
      onRequestClose={props.onClose}
    >
      <SafeAreaProvider>
        <ScreenFrame standalone>
          <View style={styles.header}>
            <Text numberOfLines={2} style={styles.title}>
              {props.name}
            </Text>
            <Tool label={t("documents.closePreview")} symbol="×" onPress={props.onClose} />
          </View>
          <Reader key={props.page} {...props} material={material} />
        </ScreenFrame>
      </SafeAreaProvider>
    </Modal>
  );
}

function Reader({
  imageUri,
  text,
  name,
  page,
  count,
  error,
  onPage,
  onRetry,
  material,
}: Props & {
  material: ReturnType<typeof useNavigationMaterial>;
}) {
  const { t } = useAppTranslation();
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [ratio, setRatio] = useState(0.7);
  const width = Math.max(1, Math.min(viewport.width - 24, (viewport.height - 24) * ratio)) * zoom;
  const height = width / ratio;
  const pageLabel = t("documents.page", { page: page + 1, count });
  const ready = Boolean(imageUri) && !error;
  return (
    <>
      <View
        style={styles.viewport}
        onLayout={({ nativeEvent: { layout } }) =>
          setViewport({ width: layout.width, height: layout.height })
        }
      >
        {error ? (
          <View style={styles.message}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t("documents.previewError")}
            </Text>
            <Button label={t("database.errorAction")} onPress={onRetry} />
          </View>
        ) : imageUri ? (
          <ScrollView
            key={`${viewport.width}:${viewport.height}`}
            nestedScrollEnabled
            style={styles.viewport}
            contentContainerStyle={{ minHeight: viewport.height, justifyContent: "center" }}
          >
            <ScrollView
              horizontal
              nestedScrollEnabled
              style={{ height }}
              contentContainerStyle={{
                minWidth: viewport.width,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                accessibilityLabel={text || `${name}, ${pageLabel}`}
                source={{ uri: imageUri }}
                contentFit="contain"
                onLoad={({ source }) => {
                  if (source.width > 0 && source.height > 0) setRatio(source.width / source.height);
                }}
                style={{ width, height }}
              />
            </ScrollView>
          </ScrollView>
        ) : (
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {t("documents.loading")}
          </Text>
        )}
      </View>
      <NavigationSurface material={material} style={styles.toolbar}>
        <View style={styles.row}>
          <Tool
            label={t("documents.previousPage")}
            symbol="‹"
            disabled={page === 0 || (!ready && !error)}
            onPress={() => onPage(page - 1)}
          />
          <Text accessibilityLiveRegion="polite" style={styles.counter}>
            {count ? pageLabel : t("documents.loading")}
          </Text>
          <Tool
            label={t("documents.nextPage")}
            symbol="›"
            disabled={!ready || page + 1 >= count}
            onPress={() => onPage(page + 1)}
          />
        </View>
        <View style={styles.row}>
          <Tool
            label={t("documents.zoomOut")}
            symbol="−"
            disabled={!ready || zoom === 1}
            onPress={() => setZoom((value) => Math.max(1, value - 0.5))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("documents.fitPage")}
            accessibilityState={{ disabled: !ready }}
            disabled={!ready}
            onPress={() => setZoom(1)}
            style={styles.fit}
          >
            <Text style={styles.fitText}>
              {Math.round(zoom * 100)}% · {t("documents.fitPage")}
            </Text>
          </Pressable>
          <Tool
            label={t("documents.zoomIn")}
            symbol="+"
            disabled={!ready || zoom === 3}
            onPress={() => setZoom((value) => Math.min(3, value + 0.5))}
          />
        </View>
      </NavigationSurface>
    </>
  );
}

function Tool({
  label,
  symbol,
  disabled = false,
  onPress,
}: Readonly<{ label: string; symbol: string; disabled?: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.tool}
    >
      <Text accessible={false} style={[styles.symbol, disabled && styles.disabled]}>
        {symbol}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 4,
  },
  title: { flex: 1, color: "#e7e7e1", fontSize: 17, fontWeight: "600" },
  viewport: { flex: 1 },
  message: { padding: 24, gap: 16, color: "#a4aaa1" },
  error: { color: "#ff8b83", fontSize: 16 },
  toolbar: { width: "100%", maxWidth: 520, alignSelf: "center", marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  tool: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  symbol: { color: "#74b493", fontSize: 30, textAlign: "center" },
  disabled: { color: "#73776f" },
  counter: { flex: 1, color: "#e7e7e1", fontSize: 15, textAlign: "center", paddingVertical: 8 },
  fit: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  fitText: { color: "#74b493", fontSize: 15, textAlign: "center" },
});
