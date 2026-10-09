import Link from "next/link";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const works = [
  { name: "Resurfacing", dept: "Roads", from: 1, to: 2, style: "bg-ink text-white" },
  { name: "Water pipeline", dept: "Water Board", from: 3, to: 4, style: "border-2 border-hazard bg-white text-ink" },
  { name: "Drain repair", dept: "Drainage", from: 5, to: 6, style: "border border-line bg-white text-ink" },
];

export default function Home() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
      <section>
        <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          One road,
          <br />
          dug once.
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          See what is planned on your street, who is doing it, and whether it is on schedule.
          Departments see all planned work before the digging starts.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/search" className="rounded-sm bg-ink px-5 py-3 font-medium text-white">
            Find work near me
          </Link>
          <Link href="/map" className="rounded-sm border border-ink px-5 py-3 font-medium">
            Open the map
          </Link>
        </div>
      </section>

      <section aria-label="Example road timeline" className="border border-line bg-white p-5">
        <p className="font-display text-xl font-semibold">Station Road, sample segment</p>
        <p className="mb-4 text-sm text-muted">Three departments, six months</p>

        <div className="grid grid-cols-6 gap-1 text-xs text-muted">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        <div className="mt-2 space-y-2">
          {works.map((w) => (
            <div key={w.name} className="grid grid-cols-6 gap-1">
              <div
                className={`rounded-sm px-2 py-2 text-sm ${w.style}`}
                style={{ gridColumn: `${w.from} / ${w.to + 1}` }}
              >
                <span className="font-medium">{w.name}</span>
                <span className="block text-xs opacity-70">{w.dept}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex">
          <div className="hazard-stripe w-2 shrink-0" aria-hidden="true" />
          <p className="bg-ground p-3 text-sm">
            <strong>Conflict found.</strong> The pipeline starts one month after resurfacing ends.
            Suggested fix: lay the pipeline first, or bundle both into one work window.
          </p>
        </div>
      </section>
    </main>
  );
}