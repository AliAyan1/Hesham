export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-6" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="mb-3 h-5 animate-pulse rounded-lg bg-gradient-to-r from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6] bg-[length:200%_100%]"
          style={{
            width: index % 3 === 0 ? "100%" : index % 3 === 1 ? "75%" : "50%",
          }}
        />
      ))}
    </div>
  );
}
