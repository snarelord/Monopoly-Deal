import { useState } from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";


interface FanControlsProps {
  minDegrees: number;
  maxDegrees: number;
  degreeStep: number;
  degreesBetweenCards: number;
  setDegreesBetweenCards: React.Dispatch<React.SetStateAction<number>>;
}

export default function FanControls({
  minDegrees,
  maxDegrees,
  degreeStep,
  degreesBetweenCards,
  setDegreesBetweenCards,
}: FanControlsProps) {
  function adjustFan(direction: "increase" | "decrease") {
    setDegreesBetweenCards((current) => {
      if (direction === "increase") return Math.min(current + degreeStep, maxDegrees);
      return Math.max(current - degreeStep, minDegrees);
    });
  }
  return (
  <div className="flex justify-center items-center gap-6 mt-4">
    <button
      type="button"
      onClick={() => adjustFan("decrease")}
      disabled={degreesBetweenCards <= minDegrees}
      aria-label="Decrease card spacing"
      className="disabled:opacity-30"
    >
      <FontAwesomeIcon
        icon={faArrowLeft}
        className="text-black cursor-pointer"
      />
    </button>
    <button
      type="button"
      onClick={() => adjustFan("increase")}
      disabled={degreesBetweenCards >= maxDegrees}
      aria-label="Increase card spacing"
      className="disabled:opacity-30"
    >
      <FontAwesomeIcon
        icon={faArrowRight}
        className="text-black cursor-pointer"
      />
    </button>
  </div>
  )
}
