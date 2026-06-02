interface MascotProps {
  width?: number;
  height?: number;
  className?: string;
}

export function Mascot({ width = 200, height = 200, className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={width}
      height={height}
      className={className}
    >
      <use href="#mascot" />
    </svg>
  );
}
