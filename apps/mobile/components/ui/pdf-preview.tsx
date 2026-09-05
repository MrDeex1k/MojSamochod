import { useEffect, useState } from "react";
import { File } from "expo-file-system";
import { Text, View } from "react-native";
import DocumentPreview from "@/modules/document-preview/src/DocumentPreviewModule";
import { useAppTranslation } from "@/localization/use-app-translation";
import { Button } from "./button";
import { Image } from "./image";

export function PdfPreview({ uri, name }: Readonly<{ uri: string; name: string }>) {
  const { t } = useAppTranslation();
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    source: string;
    page: number;
    uri: string;
    count: number;
    text: string;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let renderedUri: string | undefined;
    const remove = () => {
      if (!renderedUri) return;
      try {
        const file = new File(renderedUri);
        if (file.exists) file.delete();
      } catch {
        /* Startup/reset retries private preview cleanup. */
      }
    };
    if (!DocumentPreview) return;
    void DocumentPreview.renderPage(uri, page)
      .then((result) => {
        renderedUri = result.uri;
        if (!active) {
          remove();
          return;
        }
        setState({
          source: uri,
          page,
          uri: result.uri,
          count: result.pageCount,
          text: result.text,
        });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      remove();
    };
  }, [uri, page, attempt]);
  const current = state?.source === uri && state.page === page ? state : null;
  return (
    <View className="gap-content">
      {error || !DocumentPreview ? (
        <>
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t("documents.previewError")}
          </Text>
          <Button
            label={t("database.errorAction")}
            onPress={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          />
        </>
      ) : current ? (
        <>
          <Image
            accessibilityLabel={
              current.text ||
              `${name}, ${t("documents.page", { page: page + 1, count: current.count })}`
            }
            source={{ uri: current.uri }}
            contentFit="contain"
            style={{ width: "100%", aspectRatio: 0.7 }}
          />
          <Text className="text-body text-secondary">
            {t("documents.page", { page: page + 1, count: current.count })}
          </Text>
        </>
      ) : (
        <Text accessibilityLiveRegion="polite" className="text-body text-secondary">
          {t("documents.loading")}
        </Text>
      )}
      <View className="flex-row gap-content">
        <View className="flex-1">
          <Button
            label={t("documents.previousPage")}
            variant="secondary"
            disabled={!current || page === 0}
            onPress={() => {
              setError(false);
              setPage((value) => value - 1);
            }}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t("documents.nextPage")}
            variant="secondary"
            disabled={!current || page + 1 >= current.count}
            onPress={() => {
              setError(false);
              setPage((value) => value + 1);
            }}
          />
        </View>
      </View>
    </View>
  );
}
