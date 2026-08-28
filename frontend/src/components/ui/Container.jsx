const widths = {
  narrow: "max-w-2xl",
  reading: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

export default function Container({ size = "default", className = "", children }) {
  return (
    <div className={`mx-auto w-full ${widths[size]} px-5 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
