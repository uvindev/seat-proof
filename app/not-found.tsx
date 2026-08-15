import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-page">
      <p className="eyebrow">404 / missing route</p>
      <h1>No workbench here.</h1>
      <p>Return to the assignment audit.</p>
      <Link className="button primary" href="/">
        Open SeatProof
      </Link>
    </main>
  );
}
