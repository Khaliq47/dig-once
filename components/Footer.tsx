import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-earth">
      <div className="hazard-stripe h-2" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 py-10">
        <div>
          <p className="font-display text-5xl font-bold leading-none">DigOnce</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            One road, dug once. Data in this demo is simulated, and the demo logins are for judges.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href="/search" className="underline-offset-4 hover:underline">Find work near me</Link>
          <Link href="/dashboard" className="underline-offset-4 hover:underline">Accountability</Link>
          <Link href="/login" className="underline-offset-4 hover:underline">Login</Link>
        </nav>
      </div>
    </footer>
  );
}