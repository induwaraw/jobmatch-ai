/**
 * The same design tokens as the @theme block in index.css, exported for the
 * places that need real values rather than class names, such as Recharts.
 *
 * If you change a colour, change it in both places.
 */

export const colors = {
  ink: "#12211F",
  muted: "#5C6B66",
  brand: "#0F3D3E",
  brandHover: "#0A2C2D",
  brandSoft: "#E6EFEC",
  accent: "#C2571B",
  accentSoft: "#FBEEE3",
  surface: "#FBFAF7",
  panel: "#FFFFFF",
  line: "#E3DFD6",
};

/**
 * Chart series colours, ordered. Derived from the brand teal and the cinnamon
 * accent so charts belong to the same palette as the rest of the interface.
 */
export const chartSeries = [
  "#0F3D3E",
  "#C2571B",
  "#3E7C74",
  "#8A6A3B",
  "#6B8F89",
  "#B08968",
];

/**
 * Spacing convention: Tailwind's scale is 4px based, so we use the even steps
 * (2, 4, 6, 8, 12, 16, 20, 24) to keep everything on an 8px rhythm.
 */
export const spacingStep = 8;
