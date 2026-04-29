interface Props {
  label: string;
  color?: "green" | "red" | "yellow" | "blue" | "gray";
  size?: "sm" | "md";
}

const COLOR_MAP = {
  green: "bg-green-700 text-green-200",
  red: "bg-red-800 text-red-200",
  yellow: "bg-yellow-700 text-yellow-200",
  blue: "bg-blue-700 text-blue-200",
  gray: "bg-slate-700 text-slate-300",
};

export default function Badge({ label, color = "gray", size = "sm" }: Props) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";
  return (
    <span className={`inline-block rounded font-medium ${COLOR_MAP[color]} ${sizeClass}`}>
      {label}
    </span>
  );
}
