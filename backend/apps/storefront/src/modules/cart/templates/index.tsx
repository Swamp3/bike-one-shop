import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="content-container py-6 md:py-8" data-testid="cart-container">
      <h1 className="m-0 mb-4 font-heading text-[26px] font-semibold md:text-[30px]">
        Warenkorb
      </h1>

      {cart?.items?.length ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_340px] md:items-start md:gap-7">
          <div className="flex flex-col gap-3">
            {!customer && <SignInPrompt />}
            <div className="rounded-xl border border-bo-line bg-bo-surface px-4">
              <ItemsTemplate cart={cart} />
            </div>
          </div>

          {cart.region && <Summary cart={cart} />}
        </div>
      ) : (
        <div className="rounded-xl border border-bo-line bg-bo-surface">
          <EmptyCartMessage />
        </div>
      )}
    </div>
  )
}

export default CartTemplate
