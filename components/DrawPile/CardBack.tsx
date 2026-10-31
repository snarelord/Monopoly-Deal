export default function CardBack() {
  return (
    <img
      data-cy="card-back"
      src="/cards/cardBack.webp"
      alt="Monopoly Deal card back"
      className="aspect-(--card-ratio) w-full rounded-lg object-cover shadow-md"
    />
  );
}