import { Link } from "react-router-dom";

import logo from "../assets/logo.png";

const sizes = {
  sm: "h-8",
  md: "h-9 sm:h-10",
  lg: "h-12",
};

export default function Logo({ to = "/", size = "md", className = "" }) {
  const image = (
    <img
      src={logo}
      alt="JobMatch AI"
      width={402}
      height={335}
      decoding="async"
      className={`${sizes[size] ?? sizes.md} w-auto select-none object-contain`}
    />
  );

  if (!to) {
    return <span className={`inline-flex items-center ${className}`}>{image}</span>;
  }

  return (
    <Link
      to={to}
      aria-label="JobMatch AI home"
      className={`inline-flex items-center rounded-[8px] transition-opacity hover:opacity-85 ${className}`}
    >
      {image}
    </Link>
  );
}
