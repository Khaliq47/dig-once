import Link from "next/link";

const links = [
  { href: "/map", label: "Map" },
  { href: "/search", label: "Will my street be dug up?" },
  { href: "/reports", label: "Reports" },
  { href: "/department", label: "Department" },
  { href: "/dashboard", label: "Accountability" },
];

export default function Navbar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">DigOnce</Link>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
        <Link href="/login" className="ml-auto rounded bg-black px-3 py-1 text-sm text-white">
          Login
        </Link>
      </div>
    </nav>
  );
}