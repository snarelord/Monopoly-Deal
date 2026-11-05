import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";


interface FanControlsProps {
  minSpacing: number;
  maxSpacing: number;
  spacingStep: number;
  spacing: number;
  setSpacing: React.Dispatch<React.SetStateAction<number>>;
}

export default function FanControls({
  minSpacing,
  maxSpacing,
  spacingStep,
  spacing,
  setSpacing,
}: FanControlsProps) {
  function adjustFan(direction: "increase" | "decrease") {
    setSpacing((current) => {
      if (direction === "increase") return Math.min(current + spacingStep, maxSpacing);
      return Math.max(current - spacingStep, minSpacing);
    });
  }
  return (
  <div className="mt-2 flex items-center justify-center gap-6">
    <button
      type="button"
      data-cy="fan-decrease"
      onClick={() => adjustFan("decrease")}
      disabled={spacing <= minSpacing}
      aria-label="Decrease card spacing"
      className="disabled:opacity-30"
    >
      <FontAwesomeIcon
        icon={faArrowLeft}
        className="cursor-pointer text-paper"
      />
    </button>
    <button
      type="button"
      data-cy="fan-increase"
      onClick={() => adjustFan("increase")}
      disabled={spacing >= maxSpacing}
      aria-label="Increase card spacing"
      className="disabled:opacity-30"
    >
      <FontAwesomeIcon
        icon={faArrowRight}
        className="cursor-pointer text-paper"
      />
    </button>
  </div>
  )
}
