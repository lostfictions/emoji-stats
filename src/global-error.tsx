"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <div>Digest:</div>
        <pre>
          <code>{error.digest}</code>
        </pre>
        <div>toString:</div>
        <pre>
          <code>{error.toString()}</code>
        </pre>
        <div>Stack:</div>
        <pre>
          <code>{error.stack}</code>
        </pre>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
