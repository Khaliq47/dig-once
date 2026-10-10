const text = "Road work ahead · Check before you dig · One road, dug once · ";

export default function Tape() {
  return (
    <div className="overflow-hidden border-y border-line bg-hazard py-2 text-tar" aria-hidden="true">
      <div className="tape-track font-display text-2xl font-semibold uppercase">
        <span className="whitespace-pre">{text.repeat(6)}</span>
        <span className="whitespace-pre">{text.repeat(6)}</span>
      </div>
    </div>
  );
}
