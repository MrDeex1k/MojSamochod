import { useEffect, useEffectEvent } from "react";
import { AppState } from "react-native";
import type {
  VehiclePhotoPicker,
  VehiclePhotoSelectionResult,
} from "@/application/storage/vehicle-photo-picker";

export function useRecoveredVehiclePhoto(
  picker: VehiclePhotoPicker,
  owner: string,
  receive: (result: VehiclePhotoSelectionResult) => void,
) {
  const receiveLatest = useEffectEvent(receive);
  useEffect(() => {
    if (!picker.takeRecovered) return;
    const controller = new AbortController();
    const check = () => {
      void picker.takeRecovered!(owner, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted && result) receiveLatest(result);
        })
        .catch(() => undefined);
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    check();
    return () => {
      controller.abort();
      subscription.remove();
    };
  }, [picker, owner]);
}
