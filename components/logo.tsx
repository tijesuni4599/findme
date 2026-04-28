import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
};

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {/* Map-pin mark */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="currentColor"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 0C3.582 0 0 3.582 0 8c0 5.5 8 12 8 12s8-6.5 8-12c0-4.418-3.582-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
        />
      </svg>
      {!iconOnly && (
        <span className="font-semibold tracking-tight">findme</span>
      )}
    </span>
  );
}
