import Link from "next/link";

export default function Rules() {
  return (
    <main
      data-cy="rules"
      className="flex min-h-dvh flex-col items-start gap-4 bg-primary px-[clamp(20px,5vw,72px)] py-[clamp(32px,7vh,72px)] text-paper"
    >
      <h1 className="font-heading text-6xl">Rules</h1>
      <p className="text-paper/80">TO DO</p>
      <Link href="/" className="inline-block py-3 text-sm underline hover:text-highlight">
        Back
      </Link>
    </main>
  );
}
