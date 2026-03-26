export function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-500">{name}</p>
      <p className="text-gray-600 text-sm mt-1">Coming in a future update</p>
    </div>
  );
}
