"use client";

import { MotionConfig, motion } from "motion/react";
import Link from "next/link";

const MotionLink = motion.create(Link);

// the brackets from the [Deal] logo: they open around the word, spread on hover and close up when pressed
const bracket = (side: -1 | 1) => ({
  closed: { x: side * -18 },
  open: { x: 0 },
  hover: { x: side * 5 },
  pressed: { x: side * -2 },
});
const word = { closed: { opacity: 0 }, open: { opacity: 1 } };

export default function BackLink({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <MotionLink
        href={href}
        data-cy="back"
        initial="closed"
        animate="open"
        whileHover="hover"
        whileFocus="hover"
        whileTap="pressed"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`relative z-10 inline-flex min-h-11 items-center gap-1 self-start px-1 font-heading text-3xl leading-none focus-visible:outline-3 focus-visible:outline-highlight ${className}`}
      >
        <motion.span aria-hidden="true" variants={bracket(-1)} className="text-highlight">
          [
        </motion.span>
        <motion.span variants={word}>Back</motion.span>
        <motion.span aria-hidden="true" variants={bracket(1)} className="text-highlight">
          ]
        </motion.span>
      </MotionLink>
    </MotionConfig>
  );
}
