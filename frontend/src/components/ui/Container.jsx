/**
 * The one page container. Every screen uses this so the left edge of the
 * content lines up from page to page.
 */
export default function Container({ size = "default", className = "", children }) {
  const widths = {
    default: "max-w-6xl",
    narrow: "max-w-2xl",
    wide: "max-w-7xl",
  };

  return (
    <div className={`mx-auto w-full ${widths[size]} px-6 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}
