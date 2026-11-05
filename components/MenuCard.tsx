import Link from "next/link";
import type { ReactNode } from "react";

interface MenuCardProps {
  href: string;
  label: string;
  title: string[];
  blurb: string;
  colour: string;
  badge: ReactNode;
  tag?: string;
  dataCy: string;
  className?: string;
}

export default function MenuCard({ href, label, title, blurb, colour, badge, tag, dataCy, className = "" }: MenuCardProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      data-cy={dataCy}
      className={`@container relative block aspect-(--card-ratio) w-(--w) flex-none rounded-[calc(var(--w)*0.06)] text-primary transition-transform duration-250 ease-out focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-highlight motion-reduce:transition-none ${className}`}
    >
      <div className="absolute inset-0 rounded-[6cqw] bg-white shadow-[0_12px_32px_rgb(0_0_0/35%)]">
        <div className={`absolute inset-[4.4cqw] overflow-hidden rounded-[3.6cqw] border-[0.4cqw] border-primary ${colour}`}>
          <div className="absolute top-[3cqw] left-[3cqw] grid size-[15cqw] place-items-center rounded-full border-[0.45cqw] border-primary bg-white font-heading text-[8cqw] leading-none">
            {badge}
          </div>

          {tag && (
            <div className="absolute top-[5cqw] right-[3cqw] rounded-full border-[0.4cqw] border-primary bg-white px-[3.6cqw] pt-[1.5cqw] pb-[1.1cqw] font-heading text-[6cqw] leading-none tracking-[0.04em]">
              {tag}
            </div>
          )}

          <div className="absolute top-[24cqw] left-1/2 flex size-[54cqw] -translate-x-1/2 flex-col items-center justify-center rounded-full border-[0.6cqw] border-primary bg-white font-heading text-[15cqw] leading-[0.95]">
            {title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>

          <p className="absolute right-[3cqw] bottom-[3cqw] left-[3cqw] flex h-[34cqw] items-center justify-center rounded-[3cqw] bg-white px-[6cqw] text-center text-[5.4cqw] leading-[1.35]">
            {blurb}
          </p>
        </div>
      </div>
    </Link>
  );
}
