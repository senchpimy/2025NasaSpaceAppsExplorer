import { useSearchParams } from "react-router-dom";

export const AVAILABLE_YEARS = [2025, 2024, 2023] as const;

export type AvailableYear = (typeof AVAILABLE_YEARS)[number];

export function useYear(): number {
  const [params] = useSearchParams();
  const year = Number(params.get("year"));
  return (AVAILABLE_YEARS as readonly number[]).includes(year) ? year : 2025;
}
