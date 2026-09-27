const PlpPageHead = ({
  title,
  count,
}: {
  title: string
  count?: number
}) => {
  return (
    <div className="px-4 pb-1.5 pt-1.5 md:px-6">
      <h1 className="m-0 mb-1 font-heading text-[28px] font-semibold md:text-[34px]">
        {title}
      </h1>
      {count !== undefined && (
        <div className="font-mono text-[12.5px] text-bo-ink-faint">
          {count} {count === 1 ? "Ergebnis" : "Ergebnisse"}
        </div>
      )}
    </div>
  )
}

export default PlpPageHead
