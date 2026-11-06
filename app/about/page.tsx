import BackLink from "@/components/BackLink";

export default function About() {
  return (
    <main
      data-cy="about"
      className="flex min-h-dvh flex-col items-start gap-4 bg-primary px-[clamp(20px,5vw,72px)] py-[clamp(32px,7vh,72px)] text-paper"
    >
      <BackLink />
      <h1 className="font-heading text-6xl">About</h1>
      <p className="text-paper/80">TO DO</p>
    </main>
  );
}
