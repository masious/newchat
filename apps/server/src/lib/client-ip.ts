/**
 * Extract client IP from proxy headers, falling back to "unknown".
 */
export function getClientIp(getHeader: (name: string) => string | undefined): string {
  return (
    getHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    getHeader("x-real-ip") ||
    "unknown"
  );
}
