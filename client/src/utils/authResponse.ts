export function getAuthToken(payload: unknown) {
  const data = payload as { token?: string; data?: { token?: string } };
  return data.data?.token ?? data.token ?? "";
}
