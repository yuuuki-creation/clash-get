import { Thunderbolt } from "@gravity-ui/icons";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-12 rounded-2xl" : "size-9 rounded-xl";
  const icon = size === "lg" ? "size-6" : "size-[18px]";
  return (
    <div className={`flex shrink-0 items-center justify-center bg-accent text-accent-foreground ${box}`}>
      <Thunderbolt className={icon} aria-hidden />
    </div>
  );
}
