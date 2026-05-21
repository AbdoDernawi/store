export function phoneAliasEmail(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `${digits}@phone-login.local` : "";
}
