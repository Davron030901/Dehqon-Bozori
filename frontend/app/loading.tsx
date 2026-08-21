export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-7">
      <div className="skeleton h-9 w-3/4 max-w-lg" />
      <div className="skeleton mt-3 h-5 w-full max-w-2xl" />
      <div className="skeleton mt-5 h-12 w-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton h-[230px] w-full" />
        ))}
      </div>
    </div>
  );
}
