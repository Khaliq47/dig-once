import Link from "next/link";
import RoadStory from "@/components/RoadStory";
import Tape from "@/components/Tape";

const rows = [
  {
    title: "Residents",
    text: "Check any street. See who is digging, why, and when it ends.",
    href: "/search",
    link: "Find work near me",
  },
  {
    title: "Departments",
    text: "Submit planned work and see conflicts with other departments before the first cut.",
    href: "/department",
    link: "Open the department portal",
  },
  {
    title: "The city",
    text: "Rank departments and contractors by on-time work, delays and repeat digs.",
    href: "/dashboard",
    link: "See the accountability dashboard",
  },
];

export default function Home() {
  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pt-14 lg:pt-20">
          <h1 className="font-display text-[clamp(4.5rem,15vw,12rem)] font-bold uppercase leading-[0.85] tracking-tight">
            One road,
            <br />
            <span className="text-outline">dug once.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
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
        </div>

        <div className="road-scene mt-10" aria-hidden="true">
          <div className="road-plane">
            <div className="road-edge" style={{ left: "20%" }} />
            <div className="road-edge" style={{ right: "20%" }} />
            <div className="lane-dash" />
            <div className="absolute left-[20%] right-[20%] top-[40%] h-14 bg-earth">
              <div className="hazard-stripe absolute inset-x-0 top-0 h-2" />
              <div className="hazard-stripe absolute inset-x-0 bottom-0 h-2" />
            </div>
          </div>
          <div className="horizon" />
        </div>
      </section>

      <Tape />

      <section className="pt-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="reveal mb-8 font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
            One street, three cuts
          </h2>
        </div>
        <RoadStory />
      </section>

      <section className="mx-auto max-w-6xl border-b border-line">
        {rows.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="reveal group grid items-center gap-2 border-t border-line px-4 py-8 transition-colors hover:bg-earth md:grid-cols-[1.2fr_1fr] md:gap-10"
          >
            <span className="font-display text-6xl font-bold uppercase leading-none transition-colors group-hover:text-hazard sm:text-8xl">
              {r.title}
            </span>
            <span>
              <span className="block max-w-sm text-muted">{r.text}</span>
              <span className="mt-3 inline-block font-medium underline underline-offset-4">{r.link}</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}