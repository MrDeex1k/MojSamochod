import { nativeTheme } from "@/styles/native-theme";
import { IconAction } from "./icon-action";
import { useLayoutEffect, useRef, useState, type ComponentRef } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
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
  const horizontal = useReadingPosition("x", viewport.width, width);
  const vertical = useReadingPosition("y", viewport.height, height);
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
            {...vertical}
            nestedScrollEnabled
            style={styles.viewport}
            contentContainerStyle={{ minHeight: viewport.height, justifyContent: "center" }}
          >
            <ScrollView
              {...horizontal}
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
            disabled={page + 1 >= count || (!ready && !error)}
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
            android_ripple={{ color: `${nativeTheme.accent.slice(0, 7)}24` }}
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

// Keep the point at the centre of the visible page when the viewport changes.
function useReadingPosition(axis: "x" | "y", viewport: number, pageSize: number) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const centre = useRef<number | null>(null);
  const dragging = useRef(false);
  const size = axis === "x" ? "width" : "height";
  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const visible = nativeEvent.layoutMeasurement[size];
    const content = nativeEvent.contentSize[size];
    if (dragging.current && content > visible) {
      centre.current = (nativeEvent.contentOffset[axis] + visible / 2) / content;
    }
  };
  useLayoutEffect(() => {
    dragging.current = false;
    if (centre.current === null || viewport <= 0) return;
    const offset = Math.max(
      0,
      Math.min(pageSize - viewport, centre.current * pageSize - viewport / 2),
    );
    ref.current?.scrollTo({ [axis]: offset, animated: false });
  }, [axis, pageSize, viewport]);
  return {
    ref,
    onScroll,
    scrollEventThrottle: 16,
    onScrollBeginDrag: () => {
      dragging.current = true;
    },
    onScrollEndDrag: () => {
      dragging.current = false;
    },
    onMomentumScrollBegin: () => {
      dragging.current = true;
    },
    onMomentumScrollEnd: () => {
      dragging.current = false;
    },
  };
}

function Tool({
  label,
  symbol,
  disabled = false,
  onPress,
}: Readonly<{ label: string; symbol: string; disabled?: boolean; onPress: () => void }>) {
  if (Platform.OS === "android") {
    const icons = {
      "×": "close",
      "‹": "previous",
      "›": "next",
      "−": "zoom-out",
      "+": "zoom-in",
    } as const;
    return (
      <IconAction
        icon={icons[symbol as keyof typeof icons]}
        label={label}
        disabled={disabled}
        onPress={onPress}
      />
    );
  }
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
  title: { flex: 1, color: nativeTheme.primary, fontSize: 17, fontWeight: "600" },
  viewport: { flex: 1 },
  message: { padding: 24, gap: 16, color: nativeTheme.secondary },
  error: { color: nativeTheme.danger, fontSize: 16 },
  toolbar: { width: "100%", maxWidth: 520, alignSelf: "center", marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  tool: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  symbol: { color: nativeTheme.accent, fontSize: 30, textAlign: "center" },
  disabled: { color: nativeTheme.secondary },
  counter: {
    flex: 1,
    color: nativeTheme.primary,
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 8,
  },
  fit: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  fitText: { color: nativeTheme.accent, fontSize: 15, textAlign: "center" },
});
