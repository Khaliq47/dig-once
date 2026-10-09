import Link from "next/link";
import RoadStory from "@/components/RoadStory";

const audiences = [
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
      <section className="on-dark bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 lg:pt-20">
          <h1 className="font-display text-[clamp(4rem,13vw,10rem)] font-bold leading-[0.88] tracking-tight">
            One road,
            <br />
            dug once.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            See what is planned on your street, who is doing it, and whether it is on schedule.
            Departments see all planned work before the digging starts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search" className="rounded-sm bg-white px-5 py-3 font-medium text-ink">
              Find work near me
            </Link>
            <Link href="/map" className="rounded-sm border border-white px-5 py-3 font-medium">
              Open the map
            </Link>
          </div>
        </div>
        <RoadStory />
      </section>

      <section className="mx-auto grid max-w-6xl gap-0 px-4 py-14 md:grid-cols-3">
        {audiences.map((a, i) => (
          <div
            key={a.title}
            className={`py-4 md:px-6 ${i > 0 ? "border-t border-line md:border-l md:border-t-0" : "md:pl-0"}`}
          >
            <h2 className="font-display text-3xl font-semibold">{a.title}</h2>
            <p className="mt-2 text-muted">{a.text}</p>
            <Link href={a.href} className="mt-3 inline-block font-medium underline underline-offset-4">
              {a.link}
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}