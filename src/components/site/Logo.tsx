import logo from "@/assets/ea-crown-logo.png";

type Props = {
  /** Visual size of the crown mark in pixels. */
  size?: number;
  /** Show the EMMY & ABBY wordmark next to the mark. */
  withWordmark?: boolean;
  /** Show the brand tagline under the wordmark. */
  withTagline?: boolean;
  /** Use light type for dark backgrounds. */
  light?: boolean;
  className?: string;
};

export const BRAND = "EMMY & ABBY";
export const TAGLINE = "One Style. Two Brands. Endless You.";
export const PHONES = ["08055256283", "08052680428", "09044746884"];
export const WHATSAPP_NUMBERS = ["2348055256283", "2348052680428", "2349044746884"];
export const BRAND_EMAIL = "abbydesignhub@gmail.com";

export function Logo({
  size = 40,
  withWordmark = true,
  withTagline = false,
  light = false,
  className = "",
}: Props) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <img
        src={logo}
        alt="EMMY & ABBY crown monogram logo"
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className="object-contain"
      />
      {withWordmark && (
        <span className="leading-none">
          <span
            className={`block font-display tracking-[0.16em] ${light ? "text-ink-foreground" : ""}`}
            style={{ fontSize: Math.max(16, size * 0.55) }}
          >
            EMMY <span className="text-gold">&amp;</span> ABBY
          </span>
          {withTagline && (
            <span
              className={`mt-1 block text-[10px] uppercase tracking-[0.28em] ${
                light ? "text-ink-foreground/60" : "text-muted-foreground"
              }`}
            >
              {TAGLINE}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
