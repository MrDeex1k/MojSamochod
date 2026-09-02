import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { getLocales } from "expo-localization";
import { useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";

import type { RefuellingService } from "@/application/refuelling/refuelling-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import {
  parseUnitPriceMilliUnits,
  pricingFromTotalCost,
  pricingFromUnitPrice,
} from "@/domain/refuelling/pricing";
import type {
  CreateRefuellingInput,
  FillKind,
  PriceInputMode,
  Refuelling,
  RefuellingPricingInput,
} from "@/domain/refuelling/refuelling";
import {
  parseVolumeToMicrolitres,
  positiveMicrolitres,
  type Microlitres,
  type VolumeUnit,
} from "@/domain/refuelling/volume";
import type { Clock } from "@/domain/shared/ports";
import type { ValidationIssue } from "@/domain/shared/result";
import { distanceToMetres, metresToDistance } from "@/domain/vehicle/distance";
import type { FuelConfiguredVehicle } from "@/domain/vehicle/vehicle";
import {
  currencyFractionDigits,
  formatCurrencyInputMinorUnits,
  parseCurrencyInput,
} from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

import {
  formatConvertedUnitPrice,
  formatEditableFuelVolume,
  volumeUnitLabel,
} from "./refuelling-presentation";

type PickerMode = "date" | "time" | null;
type FieldErrors = Partial<
  Record<"currency" | "occurredAt" | "odometerMetres" | "price" | "quantity", string>
>;

type RefuellingFormProps = Readonly<{
  clock: Clock;
  embedded?: boolean;
  onCancel: () => void;
  onSaved: () => void;
  refuelling?: Refuelling;
  refuellings: RefuellingService;
  vehicle: FuelConfiguredVehicle;
}>;

export function RefuellingForm({
  clock,
  embedded = false,
  onCancel,
  onSaved,
  refuelling,
  refuellings,
  vehicle,
}: RefuellingFormProps) {
  const { t, i18n } = useAppTranslation();
  const volumeUnit = vehicle.fuelVolumeUnitPreference;
  const [occurredAt, setOccurredAt] = useState(() =>
    toUtcMinute(new Date(refuelling?.occurredAt ?? clock.now())),
  );
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [quantity, setQuantity] = useState(() =>
    refuelling
      ? formatEditableFuelVolume(refuelling.quantityMicrolitres, volumeUnit, i18n.language)
      : "",
  );
  const quantityMicrolitres = useRef<number>(refuelling?.quantityMicrolitres ?? Number.NaN);
  const quantityChanged = useRef(false);
  const [fillKind, setFillKind] = useState<FillKind>(refuelling?.fillKind ?? "full");
  const [odometer, setOdometer] = useState(() => formatInitialOdometer(refuelling, vehicle));
  const odometerChanged = useRef(false);
  const [priceInputMode, setPriceInputMode] = useState<PriceInputMode>(
    refuelling?.pricing?.inputMode ?? "total",
  );
  const [price, setPrice] = useState(() =>
    formatInitialPrice(refuelling, volumeUnit, i18n.language),
  );
  const pricingChanged = useRef(false);
  const [currency, setCurrency] = useState(
    refuelling?.pricing?.totalCost.currency ?? getLocales()[0]?.currencyCode ?? "USD",
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setFormError(false);
    const parsed = parseInput({
      currency,
      fillKind,
      locale: i18n.language,
      occurredAt,
      odometer,
      odometerChanged: odometerChanged.current,
      price,
      priceInputMode,
      pricingChanged: pricingChanged.current,
      quantityMicrolitres: quantityMicrolitres.current,
      quantityChanged: quantityChanged.current,
      refuelling,
      vehicle,
      volumeUnit,
    });
    if (!parsed.ok) {
      setErrors(mapIssues(parsed.issues, t));
      return;
    }

    setErrors({});
    setSaving(true);
    const result = await (
      refuelling ? refuellings.update(refuelling, parsed.value) : refuellings.create(parsed.value)
    ).finally(() => setSaving(false));
    if (!result.ok) {
      const issues = validationIssues(result.error.cause);
      if (issues) setErrors(mapIssues(issues, t));
      else setFormError(true);
      return;
    }
    onSaved();
  };

  const cancel = () => {
    Alert.alert(t("refuelling.discardTitle"), t("refuelling.discardDescription"), [
      { style: "cancel", text: t("refuelling.keepEditing") },
      { onPress: onCancel, style: "destructive", text: t("refuelling.discard") },
    ]);
  };

  const content = (
    <Card className={embedded ? "h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t(refuelling ? "refuelling.editTitle" : "refuelling.addTitle")}
      </Text>
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
        onChangeText={(value) => {
          setQuantity(value);
          quantityChanged.current = true;
          const parsed = parseVolumeToMicrolitres(
            normalizeDecimal(value),
            volumeUnit,
            "quantity",
            2,
          );
          quantityMicrolitres.current = parsed.ok ? parsed.value : Number.NaN;
        }}
        value={quantity}
      />
      <View className="gap-compact">
        <Text className="text-label font-semibold text-primary">{t("refuelling.dateLabel")}</Text>
        <Button
          label={formatDate(occurredAt, i18n.language)}
          onPress={() => setPickerMode("date")}
          variant="secondary"
        />
        {errors.occurredAt ? (
          <Text className="text-caption text-danger">{errors.occurredAt}</Text>
        ) : null}
      </View>
      <View className="gap-compact">
        <Text className="text-label font-semibold text-primary">{t("refuelling.timeLabel")}</Text>
        <Button
          label={formatTime(occurredAt, i18n.language)}
          onPress={() => setPickerMode("time")}
          variant="secondary"
        />
      </View>
      {pickerMode ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "compact" : "default"}
          maximumDate={clock.now()}
          mode={pickerMode}
          onChange={(event, selected) => {
            handleDateTimeChange(event, selected, pickerMode, occurredAt, setOccurredAt);
            setPickerMode(null);
          }}
          timeZoneName="UTC"
          value={occurredAt}
        />
      ) : null}
      <TextField
        error={errors.odometerMetres}
        helperText={t("refuelling.odometerHelper")}
        keyboardType="number-pad"
        label={t("refuelling.odometerLabel")}
        onChangeText={(value) => {
          setOdometer(value);
          odometerChanged.current = true;
        }}
        value={odometer}
      />
      <ChoiceField
        label={t("refuelling.priceModeLabel")}
        onSelect={(mode) => {
          if (mode === priceInputMode) return;
          setPrice("");
          setPriceInputMode(mode);
          pricingChanged.current = true;
        }}
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
            onChangeText={(value) => {
              setPrice(value);
              pricingChanged.current = true;
            }}
            value={price}
          />
        </View>
        <View className="flex-1">
          <TextField
            autoCapitalize="characters"
            error={errors.currency}
            label={t("refuelling.currencyLabel")}
            maxLength={3}
            onChangeText={(value) => {
              setCurrency(value.toUpperCase());
              pricingChanged.current = true;
            }}
            value={currency}
          />
        </View>
      </View>
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {t("refuelling.saveError")}
        </Text>
      ) : null}
      <Button disabled={saving} label={t("refuelling.save")} onPress={() => void save()} />
      <Button label={t("refuelling.cancel")} onPress={cancel} variant="secondary" />
    </Card>
  );

  return embedded ? (
    <ScrollView contentContainerClassName="grow" keyboardShouldPersistTaps="handled">
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

function ChoiceField<T extends string>({
  label,
  onSelect,
  options,
  value,
}: Readonly<{
  label: string;
  onSelect: (value: T) => void;
  options: readonly (readonly [T, string])[];
  value: T;
}>) {
  return (
    <View className="gap-compact">
      <Text className="text-label font-semibold text-primary">{label}</Text>
      <View className="flex-row flex-wrap gap-compact">
        {options.map(([option, optionLabel]) => (
          <Button
            key={option}
            label={optionLabel}
            onPress={() => onSelect(option)}
            variant={value === option ? "primary" : "secondary"}
          />
        ))}
      </View>
    </View>
  );
}

type ParseInput = Readonly<{
  currency: string;
  fillKind: FillKind;
  locale: string;
  occurredAt: Date;
  odometer: string;
  odometerChanged: boolean;
  price: string;
  priceInputMode: PriceInputMode;
  pricingChanged: boolean;
  quantityMicrolitres: number;
  quantityChanged: boolean;
  refuelling?: Refuelling;
  vehicle: FuelConfiguredVehicle;
  volumeUnit: VolumeUnit;
}>;

function parseInput(
  input: ParseInput,
):
  | Readonly<{ issues: readonly ValidationIssue[]; ok: false }>
  | Readonly<{ ok: true; value: CreateRefuellingInput }> {
  const issues: ValidationIssue[] = [];
  const quantity = positiveMicrolitres(input.quantityMicrolitres, "quantity.value");
  if (!quantity.ok) issues.push(...quantity.issues);
  const odometerMetres =
    input.refuelling && !input.odometerChanged
      ? input.refuelling.odometerMetres
      : parseOdometer(input.odometer, input.vehicle);
  if (Number.isNaN(odometerMetres)) {
    issues.push({ code: "invalid-format", field: "odometerMetres" });
  }
  const pricing = quantity.ok ? parsePricingForSave(input, quantity.value) : undefined;
  if (pricing && !pricing.ok) issues.push(...pricing.issues);
  if (issues.length > 0) return { issues, ok: false };
  return {
    ok: true,
    value: {
      fillKind: input.fillKind,
      inputVolumeUnit: input.refuelling?.inputVolumeUnit ?? input.volumeUnit,
      occurredAt: input.occurredAt.toISOString(),
      odometerMetres,
      pricing: pricing?.ok ? pricing.value : undefined,
      quantityMicrolitres: quantity.ok ? quantity.value : Number.NaN,
      vehicleId: input.vehicle.id,
    },
  };
}

function parsePricingForSave(
  input: ParseInput,
  quantityMicrolitres: Microlitres,
):
  | Readonly<{ issues: readonly ValidationIssue[]; ok: false }>
  | Readonly<{ ok: true; value: RefuellingPricingInput }>
  | undefined {
  if (!input.refuelling || input.pricingChanged) {
    return parsePricing(input, quantityMicrolitres);
  }
  if (!input.refuelling.pricing) return undefined;
  if (!input.quantityChanged) {
    return { ok: true, value: pricingInput(input.refuelling.pricing) };
  }

  const existing = input.refuelling.pricing;
  const fractionDigits = currencyFractionDigits(existing.totalCost.currency, input.locale);
  return existing.inputMode === "total"
    ? pricingFromTotalCost({
        currencyFractionDigits: fractionDigits,
        quantityMicrolitres,
        totalCost: existing.totalCost,
        unitPriceVolumeUnit: existing.unitPriceVolumeUnit,
      })
    : pricingFromUnitPrice({
        currency: existing.totalCost.currency,
        currencyFractionDigits: fractionDigits,
        quantityMicrolitres,
        unitPriceMilliUnits: existing.unitPriceMilliUnits,
        unitPriceVolumeUnit: existing.unitPriceVolumeUnit,
      });
}

function pricingInput(pricing: NonNullable<Refuelling["pricing"]>): RefuellingPricingInput {
  return {
    inputMode: pricing.inputMode,
    totalCost: pricing.totalCost,
    unitPriceMilliUnits: pricing.unitPriceMilliUnits,
    unitPriceVolumeUnit: pricing.unitPriceVolumeUnit,
  };
}

function parsePricing(
  input: ParseInput,
  quantityMicrolitres: Microlitres,
):
  | Readonly<{ issues: readonly ValidationIssue[]; ok: false }>
  | Readonly<{ ok: true; value: RefuellingPricingInput }>
  | undefined {
  if (!input.price.trim()) return undefined;
  const fractionDigits = currencyFractionDigits(input.currency, input.locale);
  if (input.priceInputMode === "total") {
    const total = parseCurrencyInput(input.price, input.currency, input.locale);
    if (total.kind !== "value") {
      return { issues: [{ code: "invalid-format", field: "pricing.totalCost" }], ok: false };
    }
    return pricingFromTotalCost({
      currencyFractionDigits: fractionDigits,
      quantityMicrolitres,
      totalCost: { currency: input.currency, minorUnits: total.minorUnits },
      unitPriceVolumeUnit: input.volumeUnit,
    });
  }
  const unitPrice = parseUnitPriceMilliUnits(normalizeDecimal(input.price), "pricing.unitPrice");
  if (!unitPrice.ok) return unitPrice;
  return pricingFromUnitPrice({
    currency: input.currency,
    currencyFractionDigits: fractionDigits,
    quantityMicrolitres,
    unitPriceMilliUnits: unitPrice.value,
    unitPriceVolumeUnit: input.volumeUnit,
  });
}

function parseOdometer(value: string, vehicle: FuelConfiguredVehicle): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  const numeric = Number(value);
  return distanceToMetres(numeric, vehicle.distanceUnitPreference);
}

function formatInitialOdometer(
  refuelling: Refuelling | undefined,
  vehicle: FuelConfiguredVehicle,
): string {
  if (refuelling?.odometerMetres === undefined) return "";
  return String(
    Math.round(metresToDistance(refuelling.odometerMetres, vehicle.distanceUnitPreference)),
  );
}

function formatInitialPrice(
  refuelling: Refuelling | undefined,
  volumeUnit: FuelConfiguredVehicle["fuelVolumeUnitPreference"],
  locale: string,
): string {
  if (!refuelling?.pricing) return "";
  return refuelling.pricing.inputMode === "total"
    ? formatCurrencyInputMinorUnits(
        refuelling.pricing.totalCost.minorUnits,
        refuelling.pricing.totalCost.currency,
        locale,
      )
    : (formatConvertedUnitPrice(
        refuelling.pricing.unitPriceMilliUnits,
        refuelling.pricing.unitPriceVolumeUnit,
        volumeUnit,
        locale,
      ) ?? "");
}

function normalizeDecimal(value: string): string {
  return value.trim().replace(",", ".");
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(value);
}

function formatTime(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

function handleDateTimeChange(
  event: DateTimePickerEvent,
  selected: Date | undefined,
  mode: Exclude<PickerMode, null>,
  current: Date,
  setValue: (value: Date) => void,
) {
  if (event.type === "dismissed" || !selected) return;
  setValue(
    mode === "date"
      ? new Date(
          Date.UTC(
            selected.getUTCFullYear(),
            selected.getUTCMonth(),
            selected.getUTCDate(),
            current.getUTCHours(),
            current.getUTCMinutes(),
          ),
        )
      : new Date(
          Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth(),
            current.getUTCDate(),
            selected.getUTCHours(),
            selected.getUTCMinutes(),
          ),
        ),
  );
}

function toUtcMinute(value: Date): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
    ),
  );
}

function validationIssues(cause: unknown): readonly ValidationIssue[] | undefined {
  if (!Array.isArray(cause)) return undefined;
  return cause.every(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      "code" in value &&
      "field" in value &&
      typeof value.code === "string" &&
      typeof value.field === "string",
  )
    ? (cause as readonly ValidationIssue[])
    : undefined;
}

function mapIssues(issues: readonly ValidationIssue[], t: (key: string) => string): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    if (issue.field === "occurredAt") errors.occurredAt = t("refuelling.futureError");
    else if (issue.field === "odometerMetres") {
      errors.odometerMetres = t("refuelling.invalidOdometer");
    } else if (issue.field.startsWith("quantity")) {
      errors.quantity = t("refuelling.invalidQuantity");
    } else if (issue.field.includes("currency")) {
      errors.currency = t("refuelling.invalidCurrency");
    } else if (issue.field.startsWith("pricing") || issue.field.startsWith("totalCost")) {
      errors.price = t("refuelling.invalidPrice");
    }
  }
  return errors;
}
