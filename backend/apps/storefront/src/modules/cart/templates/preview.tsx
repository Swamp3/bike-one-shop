"use client"

import repeat from "@lib/util/repeat"
import { getBuildBaseItem, groupLineItemsByBuild } from "@lib/util/group-line-items"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import BuildGroupCard from "@modules/common/components/build-group-card"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart.items
  const hasOverflow = items && items.length > 4

  if (!items) {
    return (
      <div className="flex flex-col divide-y divide-bo-line" data-testid="items-table">
        {repeat(3).map((i) => (
          <SkeletonLineItem key={i} />
        ))}
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) => {
    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  })

  const groups = groupLineItemsByBuild(sortedItems)

  return (
    <div
      className={clx("flex flex-col divide-y divide-bo-line", {
        "max-h-[220px] overflow-y-auto pr-1": hasOverflow,
      })}
      data-testid="items-table"
    >
      {groups.map((group) => {
        if (!group.buildId) {
          const item = group.items[0]
          return (
            <Item
              key={item.id}
              item={item}
              type="preview"
              currencyCode={cart.currency_code}
            />
          )
        }

        const baseItem = getBuildBaseItem(group.items)

        return (
          <BuildGroupCard
            key={group.buildId}
            title={`Custom-Build: ${baseItem.product_title}`}
          >
            {group.items.map((item) => (
              <Item
                key={item.id}
                item={item}
                type="preview"
                currencyCode={cart.currency_code}
              />
            ))}
          </BuildGroupCard>
        )
      })}
    </div>
  )
}

export default ItemsPreviewTemplate
