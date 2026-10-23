import { cn } from "@/lib/utils";

interface PlayingCardProps extends React.ComponentProps<"div"> {
  /** The value printed on the face. Omit for a face-down card. */
  value?: string;
  /** Print the value in the suit's red instead of ink. */
  red?: boolean;
  /** Gold edge, used for the picked card and for votes that agree. */
  highlighted?: boolean;
}

/**
 * A playing card: ivory face with the value in the corner and the centre, or a
 * red patterned back when no value is given.
 *
 * Size comes from the caller's className so the same card works in a hand, a
 * row of seats and the reveal. The centre value scales with the card's width.
 */
export function PlayingCard({
  value,
  red = false,
  highlighted = false,
  className,
  children,
  ...props
}: PlayingCardProps) {
  if (value === undefined) {
    return (
      <div
        data-slot="playing-card-back"
        className={cn(
          "rounded-[10px] border-4 border-ivory shadow-[0_6px_14px_rgba(0,0,0,0.35)]",
          "bg-[repeating-linear-gradient(45deg,var(--color-suit)_0_5px,#a92c24_5px_10px)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-slot="playing-card"
      className={cn(
        "@container relative rounded-xl bg-ivory font-card font-extrabold",
        red ? "text-suit" : "text-ink",
        highlighted
          ? "shadow-[0_0_0_4px_var(--color-gold),0_16px_28px_rgba(0,0,0,0.45)]"
          : "shadow-[-4px_6px_14px_rgba(0,0,0,0.35)]",
        className
      )}
      {...props}
    >
      {/* Drawn from an attribute so the value appears once in the text */}
      <span
        aria-hidden="true"
        data-value={value}
        className="absolute top-[7%] left-[10%] text-[clamp(12px,18cqw,22px)] leading-none before:content-[attr(data-value)]"
      />
      <span
        className="absolute inset-0 flex items-center justify-center leading-none tracking-tight"
        style={{ fontSize: centreSize(value) }}
      >
        {value}
      </span>
      {children}
    </div>
  );
}

// Long values such as "XXL" or "21" need a smaller centre to fit the card.
function centreSize(value: string): string {
  const width = value.length > 2 ? 28 : value.length > 1 ? 38 : 48;
  return `clamp(20px, ${width}cqw, 64px)`;
}
