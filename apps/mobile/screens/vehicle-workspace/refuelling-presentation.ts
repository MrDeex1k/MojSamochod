import type { FuelConsumptionUnit } from "@/domain/refuelling/fuel-consumption";
import { convertUnitPriceMilliUnits } from "@/domain/refuelling/pricing";
import { microlitresToVolume, type Microlitres, type VolumeUnit } from "@/domain/refuelling/volume";
import { distanceUnitLabel, metresToDistance } from "@/domain/vehicle/distance";
import type { Vehicle } from "@/domain/vehicle/vehicle";

export function formatFuelVolume(
  microlitres: Microlitres,
  unit: VolumeUnit,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    microlitresToVolume(microlitres, unit),
  );
}

export function formatEditableFuelVolume(
  microlitres: Microlitres,
  unit: VolumeUnit,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(microlitresToVolume(microlitres, unit));
}

export function formatFuelConsumption(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatUnitPrice(unitPriceMilliUnits: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(unitPriceMilliUnits / 1000);
}

export function formatConvertedUnitPrice(
  unitPriceMilliUnits: number,
  fromUnit: VolumeUnit,
  toUnit: VolumeUnit,
  locale: string,
): string | undefined {
  const converted = convertUnitPriceMilliUnits(unitPriceMilliUnits, fromUnit, toUnit);
  return converted === undefined ? undefined : formatUnitPrice(converted, locale);
}

export function formatRefuellingOdometer(metres: number, vehicle: Vehicle, locale: string): string {
  const unit = vehicle.distanceUnitPreference;
  return `${new Intl.NumberFormat(locale).format(Math.round(metresToDistance(metres, unit)))} ${distanceUnitLabel(unit)}`;
}

export function fuelConsumptionUnitLabel(unit: FuelConsumptionUnit): string {
  switch (unit) {
    case "litresPer100Kilometres":
      return "l/100 km";
    case "milesPerUsGallon":
      return "mpg (US)";
    case "milesPerImperialGallon":
      return "mpg (UK)";
  }
}

export function volumeUnitLabel(unit: VolumeUnit): string {
  switch (unit) {
    case "litres":
      return "l";
    case "usGallons":
      return "gal (US)";
    case "imperialGallons":
      return "gal (UK)";
  }
}
