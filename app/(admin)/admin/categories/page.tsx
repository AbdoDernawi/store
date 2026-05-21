import { Eye, EyeOff, FolderPlus, Tags } from "lucide-react";
import { CategoryManagementForm, CategoryStatusButton } from "@/components/admin/AdminManagementForms";
import { getAdminCategories } from "@/lib/admin/management";
import { formatNumber } from "@/lib/admin/format";

export default async function AdminCategoriesPage() {
  const { categories } = await getAdminCategories();

  return (
    <div className="space-y-4">
      <section className="rounded-[1.35rem] border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <Tags size={19} />
          الأقسام
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">إدارة أقسام المتجر</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
          أضف الأقسام ونظم ظهورها في واجهات الزبائن والمسوقين بنقرة واحدة.
        </p>
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="mb-4 flex items-center gap-2">
          <FolderPlus className="text-emerald-600" size={20} />
          <h3 className="text-sm font-black text-slate-950">قسم جديد</h3>
        </div>
        <CategoryManagementForm />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const StatusIcon = category.is_active ? Eye : EyeOff;

          return (
            <article className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5" key={category.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-950">{category.name_ar}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{category.name_en}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${
                    category.is_active
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-slate-50 text-slate-500 ring-slate-100"
                  }`}
                >
                  <StatusIcon size={14} />
                  {category.is_active ? "ظاهر" : "مخفي"}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="text-xs font-bold text-slate-500">المنتجات</span>
                <span className="text-sm font-black text-slate-900">{formatNumber(category.products?.length || 0)}</span>
              </div>

              <div className="mt-4 flex justify-end">
                <CategoryStatusButton categoryId={category.id} isActive={category.is_active} />
              </div>
            </article>
          );
        })}
      </section>

      {!categories.length ? <div className="rounded-[1.35rem] bg-white p-5 text-sm font-bold text-slate-500">لا توجد أقسام بعد.</div> : null}
    </div>
  );
}
