import { getRandomValues } from "expo-crypto";
import { v7 as uuidV7 } from "uuid";

import type { IdGenerator } from "@/domain/shared/ports";

export class UuidV7IdGenerator implements IdGenerator {
  generate(): string {
    return uuidV7({ rng: () => getRandomValues(new Uint8Array(16)) });
  }
}
