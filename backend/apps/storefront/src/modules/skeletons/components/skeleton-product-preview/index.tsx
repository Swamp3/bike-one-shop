/** Same slots as BikeOneProductCard: 16:10 stage, dots, brand, title, groupset, price. */
const SkeletonProductPreview = () => {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-hidden rounded-xl border border-bo-line bg-bo-surface">
      <div className="aspect-[16/10] bg-bo-surface-2" />
      <div className="flex flex-col gap-1 p-3">
        <div className="flex h-[18px] items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-bo-surface-2" />
          <div className="h-3 w-3 rounded-full bg-bo-surface-2" />
        </div>
        <div className="h-[15px] w-1/4 rounded bg-bo-surface-2" />
        <div className="min-h-[2.5em] text-[15px] leading-tight">
          <div className="h-[15px] w-3/4 rounded bg-bo-surface-2" />
        </div>
        <div className="h-[18px] w-1/2 rounded bg-bo-surface-2" />
        <div className="mt-1.5 h-[22px] w-1/3 rounded bg-bo-surface-2" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
