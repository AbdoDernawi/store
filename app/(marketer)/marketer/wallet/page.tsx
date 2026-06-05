import { MarketerWalletGate } from "@/components/marketer/MarketerWalletGate";
import { requireCurrentUser } from "@/lib/auth";
import { getMarketerWalletData } from "@/lib/marketer/data";

export default async function MarketerWalletPage() {
  const user = await requireCurrentUser();
  const data = await getMarketerWalletData(user);

  return <MarketerWalletGate data={data} phone={user.phone} />;
}
