import { statusTone } from "@/lib/admin/format";

type StatusBadgeProps = {
  children: React.ReactNode;
  status?: string | null;
};

export function StatusBadge({ children, status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ring-1 ${statusTone(status)}`}>
      {children}
    </span>
  );
}
