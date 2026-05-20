import Link from "next/link";
import { Bell, CheckCircle2, PackageSearch } from "lucide-react";
import { NotificationsReadMarker } from "@/components/marketer/NotificationsReadMarker";
import { formatDate } from "@/lib/admin/format";
import { requireCurrentUser } from "@/lib/auth";
import { getMarketerNotifications } from "@/lib/marketer/data";

export default async function MarketerNotificationsPage() {
  const user = await requireCurrentUser();
  const { notifications } = await getMarketerNotifications(user);
  const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);

  return (
    <div className="space-y-4">
      <NotificationsReadMarker ids={unreadIds} />

      <section className="rounded-lg bg-white p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
        <p className="text-xs font-black text-emerald-700">الإشعارات</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">كل تنبيه في مكان واضح</h2>
      </section>

      <section className="space-y-3">
        {notifications.length ? (
          notifications.map((notification) => (
            <article
              className={`rounded-lg border p-4 shadow-sm shadow-slate-950/5 ${
                notification.is_read
                  ? "border-slate-200 bg-white"
                  : "border-emerald-100 bg-emerald-50/60"
              }`}
              key={notification.id}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    notification.is_read ? "bg-slate-50 text-slate-500" : "bg-white text-emerald-700"
                  }`}
                >
                  {notification.is_read ? <CheckCircle2 size={18} /> : <Bell size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">{notification.title}</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{notification.body}</p>
                  <p className="mt-2 text-xs font-bold text-slate-400">{formatDate(notification.created_at)}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm shadow-slate-950/5 ring-1 ring-slate-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Bell size={22} />
            </div>
            <p className="mt-3 text-sm font-black text-slate-600">لا توجد إشعارات حالياً.</p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
              href="/marketer/products"
            >
              <PackageSearch size={17} />
              تصفح المنتجات
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
