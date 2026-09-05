import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, BackHandler } from "react-native";

import { useAppTranslation } from "@/localization/use-app-translation";

type Action = () => void;
type Guard = (action: Action) => void;

function createNavigationGuard() {
  let guard: Guard | null = null;
  let approved = false;
  return {
    register(next: Guard) {
      guard = next;
      return () => {
        if (guard === next) guard = null;
      };
    },
    navigate(action: Action) {
      const perform = () => {
        approved = true;
        try {
          action();
        } finally {
          approved = false;
        }
      };
      if (guard && !approved) guard(perform);
      else perform();
    },
  };
}

const NavigationContext = createContext<ReturnType<typeof createNavigationGuard> | null>(null);

export function NavigationGuardProvider({ children }: PropsWithChildren) {
  const [navigation] = useState(createNavigationGuard);
  return <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>;
}

export function useGuardedNavigation() {
  const navigation = useContext(NavigationContext);
  return (action: Action) => (navigation ? navigation.navigate(action) : action());
}

export function useFormExitGuard(values: unknown, busy: boolean, onCancel: Action) {
  const navigation = useContext(NavigationContext);
  const { t } = useAppTranslation();
  const serialized = JSON.stringify(values);
  const [initial] = useState(serialized);
  const alertOpen = useRef(false);
  const guard: Guard = (action) => {
    if (busy || alertOpen.current) return;
    if (serialized === initial) {
      action();
      return;
    }
    alertOpen.current = true;
    Alert.alert(
      t("formGuard.title"),
      t("formGuard.description"),
      [
        {
          text: t("formGuard.keepEditing"),
          style: "cancel",
          onPress: () => {
            alertOpen.current = false;
          },
        },
        {
          text: t("formGuard.discard"),
          style: "destructive",
          onPress: () => {
            alertOpen.current = false;
            action();
          },
        },
      ],
      { cancelable: false },
    );
  };
  const cancel = () => (navigation ? navigation.navigate(onCancel) : guard(onCancel));
  useEffect(() => {
    const unregister = navigation?.register(guard);
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      cancel();
      return true;
    });
    return () => {
      unregister?.();
      subscription.remove();
    };
  });
  return cancel;
}
