import { MarketerWalletGate } from "@/components/marketer/MarketerWalletGate";
import { requireCurrentUser } from "@/lib/auth";

export default async function MarketerWalletPage() {
  await requireCurrentUser();

  return <MarketerWalletGate />;
}
