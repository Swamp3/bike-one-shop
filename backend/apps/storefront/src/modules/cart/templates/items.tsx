import repeat from "@lib/util/repeat"
import { getBuildBaseItem, groupLineItemsByBuild } from "@lib/util/group-line-items"
import { HttpTypes } from "@medusajs/types"

import Item from "@modules/cart/components/item"
import BuildGroupCard from "@modules/common/components/build-group-card"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items

  if (!items) {
    return (
      <div>
        {repeat(5).map((i) => (
          <SkeletonLineItem key={i} />
        ))}
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) => {
    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  })

  // Groups line items that share `metadata.build_id` (a configured
  // Wilier-Adlar-style add-to-cart, see PLAN.md Task 13 §2-3) under one
  // visual card; every other item renders exactly as before.
  const groups = groupLineItemsByBuild(sortedItems)

  return (
    <div>
      {groups.map((group) => {
        if (!group.buildId) {
          const item = group.items[0]
          return (
            <Item key={item.id} item={item} currencyCode={cart?.currency_code} />
          )
        }

        const baseItem = getBuildBaseItem(group.items)

        return (
          <BuildGroupCard
            key={group.buildId}
            title={`Dein Custom-Build: ${baseItem.product_title}`}
          >
            {group.items.map((item) => (
              <Item key={item.id} item={item} currencyCode={cart?.currency_code} />
            ))}
          </BuildGroupCard>
        )
      })}
    </div>
  )
}

export default ItemsTemplate
