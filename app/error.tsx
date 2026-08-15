"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="system-page">
      <p className="eyebrow">Workbench error</p>
      <h1>The audit stopped.</h1>
      <p>
        The source file remains in this browser tab. Retry the current view or
        reload to clear it.
      </p>
      <button className="button primary" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
