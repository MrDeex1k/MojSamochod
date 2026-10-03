import { UtcDateTimeFields } from "@/components/ui/utc-date-time-fields";
import { FormGroup } from "@/components/ui/form-group";
import { ChoiceField } from "@/components/ui/choice-field";
import { FormActions, FormTitle } from "@/components/layout/native-form";

import { ScrollView, Text, View } from "react-native";

import type { RefuellingService } from "@/application/refuelling/refuelling-service";
import { Screen } from "@/components/layout/screen";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/ui/text-field";

import type { Refuelling } from "@/domain/refuelling/refuelling";

import type { Clock } from "@/domain/shared/ports";

import type { FuelConfiguredVehicle } from "@/domain/vehicle/vehicle";

import { volumeUnitLabel } from "./refuelling-presentation";

type RefuellingFormProps = Readonly<{
  clock: Clock;
  embedded?: boolean;
  onCancel: () => void;
  onSaved: () => void;
  refuelling?: Refuelling;
  refuellings: RefuellingService;
  vehicle: FuelConfiguredVehicle;
}>;

import { useRefuellingForm } from "./use-refuelling-form";

export function RefuellingForm({
  clock,
  embedded = false,
  onCancel,
  onSaved,
  refuelling,
  refuellings,
  vehicle,
}: RefuellingFormProps) {
  const {
    changeOdometer,
    changePriceMode,
    changePrice,
    changeCurrency,
    changeQuantity,
    t,
    volumeUnit,
    occurredAt,
    setOccurredAt,
    quantity,
    fillKind,
    setFillKind,
    odometer,
    priceInputMode,
    price,
    currency,
    errors,
    formError,
    saving,
    cancel,
    save,
  } = useRefuellingForm({ clock, embedded, onCancel, onSaved, refuelling, refuellings, vehicle });
  const content = (
    <FormSection className={embedded ? "p-screen" : undefined}>
      <FormTitle>{t(refuelling ? "refuelling.editTitle" : "refuelling.addTitle")}</FormTitle>
      <FormGroup title={t("formGroups.refuelling")}>
        <ChoiceField
          label={t("refuelling.fillKindLabel")}
          onSelect={setFillKind}
          options={[
            ["full", t("refuelling.fillKind.full")],
            ["partial", t("refuelling.fillKind.partial")],
          ]}
          value={fillKind}
        />
        <TextField
          error={errors.quantity}
          keyboardType="decimal-pad"
          label={`${t("refuelling.quantityLabel")} (${volumeUnitLabel(volumeUnit)})`}
          onChangeText={changeQuantity}
          value={quantity}
        />
        <UtcDateTimeFields
          value={occurredAt}
          onChange={setOccurredAt}
          maximumDate={clock.now()}
          error={errors.occurredAt}
        />
      </FormGroup>
      <FormGroup title={t("formGroups.odometer")}>
        <TextField
          error={errors.odometerMetres}
          helperText={t("refuelling.odometerHelper")}
          keyboardType="number-pad"
          label={t("refuelling.odometerLabel")}
          onChangeText={changeOdometer}
          value={odometer}
        />
      </FormGroup>
      <FormGroup title={t("formGroups.cost")}>
        <ChoiceField
          label={t("refuelling.priceModeLabel")}
          onSelect={changePriceMode}
          options={[
            ["total", t("refuelling.priceMode.total")],
            ["perVolumeUnit", t("refuelling.priceMode.perVolumeUnit")],
          ]}
          value={priceInputMode}
        />
        <View className="flex-row gap-compact">
          <View className="flex-[2]">
            <TextField
              error={errors.price}
              helperText={t("refuelling.priceOptional")}
              keyboardType="decimal-pad"
              label={
                priceInputMode === "total"
                  ? t("refuelling.totalPriceLabel")
                  : `${t("refuelling.unitPriceLabel")} (/${volumeUnitLabel(volumeUnit)})`
              }
              onChangeText={changePrice}
              value={price}
            />
          </View>
          <View className="flex-1">
            <TextField
              autoCapitalize="characters"
              error={errors.currency}
              label={t("refuelling.currencyLabel")}
              maxLength={3}
              onChangeText={changeCurrency}
              value={currency}
            />
          </View>
        </View>
      </FormGroup>
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {t("refuelling.saveError")}
        </Text>
      ) : null}
      <FormActions
        busy={saving}
        saveLabel={t("refuelling.save")}
        cancelLabel={t("refuelling.cancel")}
        onSave={() => void save()}
        onCancel={cancel}
      />
    </FormSection>
  );

  return embedded ? (
    <ScrollView
      contentContainerClassName="grow"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
