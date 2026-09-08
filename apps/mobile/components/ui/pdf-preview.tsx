import { useEffect, useState } from "react";
import { File } from "expo-file-system";
import { Text, View } from "react-native";
import DocumentPreview from "@/modules/document-preview/src/DocumentPreviewModule";
import { useAppTranslation } from "@/localization/use-app-translation";
import { Button } from "./button";
import { Image } from "./image";
import { PdfFullscreen } from "./pdf-fullscreen";

export function PdfPreview({ uri, name }: Readonly<{ uri: string; name: string }>) {
  return <PdfPreviewSession key={uri} uri={uri} name={name} />;
}

function PdfPreviewSession({ uri, name }: Readonly<{ uri: string; name: string }>) {
  const { t } = useAppTranslation();
  const [fullscreen, setFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(0.7);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    source: string;
    attempt: number;
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
          attempt,
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
  const current =
    state?.source === uri && state.page === page && state.attempt === attempt ? state : null;
  const changePage = (next: number) => {
    setError(false);
    setPage(next);
    setAttempt((value) => value + 1);
  };
  const retry = () => {
    setError(false);
    setAttempt((value) => value + 1);
  };
  return (
    <View className="gap-content">
      <Button
        label={t("documents.fullscreenPreview")}
        variant="secondary"
        onPress={() => setFullscreen(true)}
      />
      {fullscreen && (
        <PdfFullscreen
          name={name}
          page={page}
          count={state?.count ?? 0}
          imageUri={current?.uri}
          text={current?.text}
          error={error || !DocumentPreview}
          onRetry={retry}
          onPage={changePage}
          onClose={() => setFullscreen(false)}
        />
      )}
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
            onLoad={({ source }) => {
              if (source.width > 0 && source.height > 0)
                setAspectRatio(source.width / source.height);
            }}
            style={{ width: "100%", aspectRatio }}
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
            onPress={() => changePage(page - 1)}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t("documents.nextPage")}
            variant="secondary"
            disabled={!current || page + 1 >= current.count}
            onPress={() => changePage(page + 1)}
          />
        </View>
      </View>
    </View>
  );
}
