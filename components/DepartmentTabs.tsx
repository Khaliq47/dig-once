"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/department", label: "Submit new project" },
  { href: "/department/manage", label: "Manage my projects" },
];

export default function DepartmentTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-line">
      <nav aria-label="Department portal" className="mx-auto flex max-w-6xl gap-6 px-6">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 py-3 text-sm font-medium ${
                active
                  ? "border-hazard text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}