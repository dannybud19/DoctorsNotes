import type { Claim } from "@medthread/domain";

/**
 * In-memory handoff of the live extract response from the Recording screen to the Session screen.
 * Deliberately simple (single demo flow, no persistence). `null` means "use the sample fixture".
 */
let liveClaims: Claim[] | null = null;

export function setLiveClaims(claims: Claim[]): void {
  liveClaims = claims;
}
export function getLiveClaims(): Claim[] | null {
  return liveClaims;
}
export function clearLiveClaims(): void {
  liveClaims = null;
}
