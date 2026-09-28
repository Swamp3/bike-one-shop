import { Metadata } from "next"

import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import OrderList from "@modules/account/components/order-list"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "Bestellungen",
  description: "Übersicht deiner Bestellungen.",
  robots: { index: false, follow: false },
}

export default async function Orders() {
  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <h2 className="m-0 mb-3.5 font-heading text-[19px] font-semibold">
        Bestellungen
      </h2>
      <OrderList orders={orders} />
      <div className="mt-6 rounded-xl border border-bo-line bg-bo-surface p-4">
        <TransferRequestForm />
      </div>
    </div>
  )
}
