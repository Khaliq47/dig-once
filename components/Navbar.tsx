import Link from "next/link";
import AuthButton from "@/components/AuthButton";

const links = [
  { href: "/reports", label: "Reports" },
  { href: "/department", label: "Department portal" },
  { href: "/dashboard", label: "Accountability" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-ground">
      <div className="hazard-stripe h-2" aria-hidden="true" />
      <nav className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-display text-3xl font-bold leading-none tracking-tight">
            DigOnce
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="py-1 underline-offset-4 decoration-hazard hover:text-ink hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}
