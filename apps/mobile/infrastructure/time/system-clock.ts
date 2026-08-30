import type { Clock } from "@/domain/shared/ports";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
