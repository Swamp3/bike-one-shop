import { FUNCTIONS } from "./soap.ts"
import {
  BRANCHES,
  UI_ORDER_STATES,
  mengeVerfuegbar,
  type Order,
  type StockQuantities,
  type Store,
} from "./state.ts"

/** HTML-escapes any value. Everything from state (incl. shop customer data and raw XML) goes through this. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const CSS = `
:root { color-scheme: light dark; --bg: #fff; --fg: #1d1d1f; --muted: #6b6b70; --line: #d9d9de; --head: #f3f3f5; --accent: #0b63ce; --warn: #b42318; --ok: #157f3b; }
@media (prefers-color-scheme: dark) { :root { --bg: #161618; --fg: #ececee; --muted: #9a9aa2; --line: #34343a; --head: #202024; --accent: #6aa6ff; --warn: #ff7b72; --ok: #4ac26b; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, -apple-system, Segoe UI, sans-serif; }
header { display: flex; gap: 16px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line); background: var(--head); flex-wrap: wrap; }
header strong { margin-right: 8px; }
header a { color: var(--fg); text-decoration: none; padding: 4px 8px; border-radius: 6px; }
header a.active { background: var(--accent); color: #fff; }
main { padding: 16px; }
h1 { font-size: 20px; margin: 0 0 12px; }
h2 { font-size: 16px; margin: 20px 0 8px; }
table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
th, td { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: var(--head); position: sticky; top: 0; font-weight: 600; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
code, pre, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
pre { background: var(--head); padding: 8px; overflow: auto; max-height: 480px; border: 1px solid var(--line); white-space: pre-wrap; word-break: break-all; }
input[type=text], input[type=number], input:not([type]) { width: 6em; padding: 2px 4px; background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 4px; }
input.wide { width: 18em; }
button { padding: 2px 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--head); color: var(--fg); cursor: pointer; }
button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
button.danger { color: var(--warn); }
form.inline { display: inline; margin: 0; }
.muted { color: var(--muted); }
.bad { color: var(--warn); font-weight: 600; }
.good { color: var(--ok); }
.flash { padding: 8px 12px; border: 1px solid var(--warn); color: var(--warn); border-radius: 6px; margin-bottom: 12px; }
details > summary { cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.card { border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 0; }
dt { color: var(--muted); }
`

const NAV: [string, string][] = [
  ["/", "Overview"],
  ["/items", "Items"],
  ["/stock", "Stock"],
  ["/orders", "Orders"],
  ["/requests", "Request log"],
]

function layout(title: string, active: string, body: string, flash?: string) {
  const nav = NAV.map(
    ([href, label]) =>
      `<a href="${href}"${href === active ? " class=\"active\"" : ""}>${esc(label)}</a>`
  ).join("")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - TriCon Mock</title>
<style>${CSS}</style>
<script src="/ui.js" defer></script>
</head>
<body>
<header><strong>TriCon Mock</strong>${nav}</header>
<main>
${flash ? `<div class="flash">${esc(flash)}</div>` : ""}
${body}
</main>
</body>
</html>
`
}

/** Hidden fields every mutating form carries: redirect target and the per-process CSRF token. */
function hiddenFields(to: string, csrf: string) {
  return `<input type="hidden" name="redirect" value="${esc(to)}"><input type="hidden" name="csrf" value="${esc(csrf)}">`
}

function bool(value: boolean) {
  return value ? "<span class=\"good\">true</span>" : "<span class=\"muted\">false</span>"
}

function maskGuid(guid: string) {
  return guid.length > 4 ? `${"*".repeat(guid.length - 4)}${guid.slice(-4)}` : "****"
}

function money(value: number | string) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : esc(value)
}

// ---------------------------------------------------------------------------

export type OverviewInfo = { guid: string; soapUrl: string; authEnabled: boolean; catalogPath: string; csrf: string }

export function renderOverview(store: Store, info: OverviewInfo, flash?: string) {
  const s = store.state
  const csrf = info.csrf
  const failures = s.requestLog.filter((r) => r.httpStatus !== 200).length
  const body = `
<h1>Overview</h1>
<div class="grid">
  <div class="card">
    <h2>Endpoint</h2>
    <dl>
      <dt>SOAP</dt><dd class="mono">POST ${esc(info.soapUrl)}</dd>
      <dt>WSDL</dt><dd class="mono"><a href="/soap?wsdl">${esc(info.soapUrl)}?wsdl</a></dd>
      <dt>IdentifyGuid</dt><dd class="mono">${esc(maskGuid(info.guid))}</dd>
      <dt>UI auth</dt><dd>${info.authEnabled ? "basic auth on" : "<span class=\"bad\">off (local dev)</span>"}</dd>
      <dt>Functions</dt><dd>${Object.keys(FUNCTIONS).map(esc).join(", ")}</dd>
    </dl>
  </div>
  <div class="card">
    <h2>State</h2>
    <dl>
      <dt>Seeded at</dt><dd>${esc(s.seededAt)}</dd>
      <dt>Artikel</dt><dd>${s.artikel.length} (${s.artikel.filter((a) => a.GrFa).length} GrFa)</dd>
      <dt>GrFa-Kombis</dt><dd>${s.grfaKombi.length}</dd>
      <dt>Stock rows</dt><dd>${s.stockBranch.length} StockBranch, ${s.stockColorSizeBranch.length} StockColorSizeBranch</dd>
      <dt>Branches</dt><dd>${BRANCHES.map(esc).join(", ")}</dd>
      <dt>Orders</dt><dd>${s.orders.length}</dd>
      <dt>Requests logged</dt><dd>${s.requestLog.length} (${failures} faults)</dd>
    </dl>
  </div>
</div>

<h2>Controls</h2>
<div class="grid">
  <div class="card">
    <h2>Failure injection</h2>
    <form method="post" action="/api/settings">
      ${hiddenFields("/", csrf)}
      <p><label>Fail next N SOAP calls (soap:Server "Injected failure"):<br>
        <input type="number" min="0" name="failNextN" value="${s.settings.failNextN}"></label></p>
      <p><label>Response delay (ms, applies to every SOAP call):<br>
        <input type="number" min="0" max="120000" name="delayMs" value="${s.settings.delayMs}"></label></p>
      <button class="primary" type="submit">Save</button>
    </form>
  </div>
  <div class="card">
    <h2>Reset</h2>
    <p class="muted">Rebuilds items, Kombis and stock from <code>${esc(info.catalogPath)}</code> (same GUIDs as before), wipes orders and the request log.</p>
    <form method="post" action="/api/reset" data-confirm="Reset all mock state to seed?">
      ${hiddenFields("/", csrf)}
      <button class="danger" type="submit">Reset to seed</button>
    </form>
  </div>
</div>
`
  return layout("Overview", "/", body, flash)
}

export function renderItems(store: Store, csrf: string, flash?: string) {
  const rows = store.state.artikel
    .map((a) => {
      const kombis = store.state.grfaKombi.filter((k) => k.Artikel === a.ArtikelID)
      const kombiTable = kombis.length
        ? `<details><summary>${kombis.length} Kombis</summary>
<table>
<tr><th>ArtikelGrFaKombiID</th><th>Artikelnummer</th><th>EAN / Barcode</th><th>Farbe</th><th>Groesse</th><th>LastChange</th></tr>
${kombis
    .map(
      (k) =>
        `<tr><td class="mono">${esc(k.ArtikelGrFaKombiID)}</td><td class="mono">${esc(k.Artikelnummer)}</td><td class="mono">${esc(k.EAN)}</td><td>${esc(k.FarbeBezeichnung)}</td><td>${esc(k.GroesseBezeichnung)}</td><td>${esc(k.LastChange)}</td></tr>`
    )
    .join("\n")}
</table></details>`
        : "<span class=\"muted\">-</span>"
      const action = `/api/items/${encodeURIComponent(a.ArtikelID)}`
      return `<tr>
<td class="mono">${esc(a.ArtikelID)}</td>
<td class="mono">${esc(a.ArtikelNummer)}</td>
<td>${esc(a.ArtikelName)}</td>
<td class="mono">${esc(a.Matchcode)}</td>
<td>${bool(a.GrFa)}</td>
<td class="num"><form class="inline" method="post" action="${action}">${hiddenFields("/items", csrf)}<input name="I_VKbrutto" value="${money(a.I_VKbrutto)}"> <button type="submit">Save</button></form></td>
<td>${esc(a.MehrwertSteuerSatz)}</td>
<td><form class="inline" method="post" action="${action}">${hiddenFields("/items", csrf)}<input type="hidden" name="toggleOnline" value="1">${bool(a.I_IstOnlineAktiv)} <button type="submit">Toggle</button></form></td>
<td>${esc(a.LastChange)}</td>
<td>${kombiTable}</td>
</tr>`
    })
    .join("\n")

  const body = `
<h1>Items (Artikel)</h1>
<p class="muted">Editing the price or toggling online-active bumps LastChange, so the next <code>DownloadArtikel</code> delta returns the item. <code>DownloadArtikelAll</code> only returns online items.</p>
<table>
<tr><th>ArtikelID</th><th>ArtikelNummer</th><th>ArtikelName</th><th>Matchcode</th><th>GrFa</th><th class="num">I_VKbrutto</th><th>MwSt</th><th>I_IstOnlineAktiv</th><th>LastChange</th><th>Kombis</th></tr>
${rows}
</table>`
  return layout("Items", "/items", body, flash)
}

type StockView = {
  id: string
  artikelName: string
  artikelNummer: string
  key: string
  variant: string
  branch: string
  row: StockQuantities
}

export function renderStock(store: Store, query: string, csrf: string, flash?: string) {
  const views: StockView[] = []
  for (const r of store.state.stockBranch) {
    const a = store.findArtikel(r.ArtikelID)
    views.push({
      id: r.StockBranchID,
      artikelName: a?.ArtikelName ?? "?",
      artikelNummer: a?.ArtikelNummer ?? "",
      key: a?.Matchcode ?? "",
      variant: "(no GrFa)",
      branch: r.Filialname,
      row: r,
    })
  }
  for (const r of store.state.stockColorSizeBranch) {
    const a = store.findArtikel(r.ArtikelID)
    const k = store.findKombi(r.ArtikelGrFaKombinationenID)
    views.push({
      id: r.StockColorSizeBranchID,
      artikelName: a?.ArtikelName ?? "?",
      artikelNummer: a?.ArtikelNummer ?? "",
      key: k?.Artikelnummer ?? "",
      variant: [k?.FarbeBezeichnung, k?.GroesseBezeichnung].filter(Boolean).join(" / "),
      branch: r.Filialname,
      row: r,
    })
  }
  views.sort((x, y) => x.key.localeCompare(y.key) || x.branch.localeCompare(y.branch))

  const q = query.trim().toLowerCase()
  const filtered = q
    ? views.filter((v) =>
      [v.artikelName, v.artikelNummer, v.key, v.variant, v.branch].some((s) =>
        s.toLowerCase().includes(q)
      )
    )
    : views
  const redirect = q ? `/stock?q=${encodeURIComponent(query)}` : "/stock"

  const rows = filtered
    .map((v) => {
      const formId = `f-${v.id}`
      const action = `/api/stock/${encodeURIComponent(v.id)}`
      const m = mengeVerfuegbar(v.row)
      const override = v.row.MengeVerfuegbarOverride
      return `<tr>
<td>${esc(v.artikelName)}<br><span class="muted mono">${esc(v.artikelNummer)}</span></td>
<td class="mono">${esc(v.key)}</td>
<td>${esc(v.variant)}</td>
<td>${esc(v.branch)}</td>
<td class="num"><input form="${esc(formId)}" name="Lagerbestand" value="${esc(v.row.Lagerbestand)}"></td>
<td class="num"><input form="${esc(formId)}" name="Reserviert" value="${esc(v.row.Reserviert)}"></td>
<td class="num"><input form="${esc(formId)}" name="Bestellt" value="${esc(v.row.Bestellt)}"></td>
<td class="num"><strong${m <= 0 ? " class=\"bad\"" : ""}>${esc(m)}</strong>${override !== null ? " <span class=\"muted\">(override)</span>" : ""}<br>
<input form="${esc(formId)}" name="MengeVerfuegbarOverride" placeholder="auto" value="${override === null ? "" : esc(override)}"></td>
<td>${esc(v.row.LastChange)}</td>
<td><form id="${esc(formId)}" class="inline" method="post" action="${action}">${hiddenFields(redirect, csrf)}
<button class="primary" type="submit" name="action" value="save">Save</button>
<button type="submit" name="action" value="set0">Set 0</button>
<button type="submit" name="action" value="onorder">On order</button>
</form></td>
</tr>`
    })
    .join("\n")

  const body = `
<h1>Stock</h1>
<p class="muted">Rows per non-GrFa item x branch (<code>DownloadStockBranch</code>) and per Kombi x branch (<code>DownloadStockColorSizeBranch</code>). MengeVerfuegbar = max(0, Lagerbestand - Reserviert) unless the override is filled. Every save bumps LastChange.</p>
<form method="get" action="/stock"><input class="wide" name="q" value="${esc(query)}" placeholder="Filter: name, SKU, color, branch"> <button type="submit">Filter</button> ${q ? "<a href=\"/stock\">clear</a>" : ""}</form>
<p class="muted">${filtered.length} of ${views.length} rows</p>
<table>
<tr><th>Item</th><th>SKU / Kombi.Artikelnummer</th><th>Variant</th><th>Filiale</th><th class="num">Lagerbestand</th><th class="num">Reserviert</th><th class="num">Bestellt</th><th class="num">MengeVerfuegbar</th><th>LastChange</th><th>Actions</th></tr>
${rows}
</table>`
  return layout("Stock", "/stock", body, flash)
}

function orderTotal(order: Order) {
  const items = order.items.reduce((sum, i) => sum + (Number(i.SummeVKBrutto) || 0), 0)
  return items + (Number(order.header.ShippingCost) || 0)
}

export function renderOrders(store: Store, flash?: string) {
  const orders = [...store.state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const rows = orders
    .map(
      (o) => `<tr>
<td><a href="/orders/${o.WebShopOrderID}">${o.WebShopOrderID}</a></td>
<td>${esc(o.createdAt)}<br><span class="muted">completed ${esc(o.header.OrderCompletedDate)}</span></td>
<td>${esc(o.customer.Kundenname)}<br><span class="muted">${esc(o.customer.Email || o.customer.UserID)}</span></td>
<td>${esc(o.header.Filialname) || "<span class=\"muted\">(shipping)</span>"}</td>
<td>${esc(o.header.Payment)}</td>
<td>${esc(o.header.DeliveryTerm)}</td>
<td class="num">${money(orderTotal(o))}</td>
<td>${esc(o.state)}</td>
<td>${bool(o.paid)}</td>
</tr>`
    )
    .join("\n")
  const body = `
<h1>Orders</h1>
<p class="muted">Orders received via <code>UploadOrder</code>. Test data only - never send real customer data to the mock.</p>
${orders.length ? `<table>
<tr><th>WebShopOrderID</th><th>Received</th><th>Customer</th><th>Filialname</th><th>Payment</th><th>DeliveryTerm</th><th class="num">Total</th><th>State</th><th>Paid</th></tr>
${rows}
</table>` : "<p>No orders yet.</p>"}`
  return layout("Orders", "/orders", body, flash)
}

function dl(record: Record<string, string> | null) {
  if (!record) {
    return "<p class=\"muted\">not sent</p>"
  }
  const entries = Object.entries(record).filter(([, v]) => v !== "")
  if (!entries.length) {
    return "<p class=\"muted\">empty</p>"
  }
  return `<dl>${entries.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`
}

export function renderOrder(order: Order, csrf: string, flash?: string) {
  const itemRows = order.items
    .map(
      (i) => `<tr>
<td class="num">${esc(i.Positionsnummer)}</td>
<td class="mono">${esc(i.WebshopArtikelnummer)}</td>
<td>${esc(i.Bezeichnung)}</td>
<td class="mono">${esc(i.ArtikelID)}</td>
<td class="mono">${esc(i.ArtikelGrFaKombiID)}</td>
<td class="mono">${esc(i.EAN)}</td>
<td class="num">${esc(i.Quantity)}</td>
<td class="num">${esc(i.VKBrutto)}</td>
<td class="num">${esc(i.SummeVKBrutto)}</td>
</tr>`
    )
    .join("\n")
  const history = order.stateHistory
    .map(
      (h) =>
        `<tr><td>${esc(h.at)}</td><td>${esc(h.state)}</td><td>${esc(h.source)}</td><td>${esc(h.note ?? "")}</td></tr>`
    )
    .join("\n")
  const buttons = UI_ORDER_STATES.map(
    (s) =>
      `<button type="submit" name="state" value="${esc(s)}"${s === order.state ? " disabled" : ""}>${esc(s)}</button>`
  ).join(" ")

  const body = `
<p><a href="/orders">&larr; Orders</a></p>
<h1>Order ${order.WebShopOrderID} <span class="muted">${esc(order.state)}${order.paid ? ", paid" : ", unpaid"}</span></h1>
<form method="post" action="/api/orders/${order.WebShopOrderID}/state">
  ${hiddenFields(`/orders/${order.WebShopOrderID}`, csrf)}
  Set state: ${buttons}
</form>
<div class="grid">
  <div class="card"><h2>Order header</h2>${dl(order.header)}<dl><dt>Total (items + shipping)</dt><dd>${money(orderTotal(order))}</dd><dt>ausgeglichenAm</dt><dd>${esc(order.ausgeglichenAm)}</dd></dl></div>
  <div class="card"><h2>Customer</h2>${dl(order.customer)}</div>
  <div class="card"><h2>Delivery address</h2>${dl(order.deliverAdress)}</div>
</div>
<h2>Items</h2>
<table>
<tr><th class="num">Pos.</th><th>WebshopArtikelnummer</th><th>Bezeichnung</th><th>ArtikelID</th><th>ArtikelGrFaKombiID</th><th>EAN</th><th class="num">Qty</th><th class="num">VKBrutto</th><th class="num">SummeVKBrutto</th></tr>
${itemRows}
</table>
<h2>State history</h2>
<table><tr><th>At</th><th>State</th><th>Source</th><th>Note</th></tr>${history}</table>
<h2>Raw request XML</h2>
<pre>${esc(order.rawRequestXml)}</pre>`
  return layout(`Order ${order.WebShopOrderID}`, "/orders", body, flash)
}

export function renderRequests(store: Store, fn: string, flash?: string) {
  const all = store.state.requestLog
  const functions = [...new Set(all.map((r) => r.function))].sort()
  const filtered = all.filter((r) => !fn || r.function === fn).slice(-500).reverse()
  const options = ["", ...functions]
    .map((f) => `<option value="${esc(f)}"${f === fn ? " selected" : ""}>${esc(f || "All functions")}</option>`)
    .join("")
  const rows = filtered
    .map(
      (r) => `<tr>
<td class="num">${r.id}</td>
<td>${esc(r.time)}</td>
<td>${esc(r.function)}</td>
<td>${r.guidOk ? "<span class=\"good\">ok</span>" : "<span class=\"bad\">no</span>"}</td>
<td class="num">${r.durationMs}</td>
<td class="num${r.httpStatus === 200 ? "" : " bad"}">${r.httpStatus}</td>
<td>${esc(r.fault ?? "")}</td>
<td><details><summary>request / response</summary><h2>Request</h2><pre>${esc(r.requestXml)}</pre><h2>Response</h2><pre>${esc(r.responseXml)}</pre></details></td>
</tr>`
    )
    .join("\n")
  const body = `
<h1>Request log</h1>
<form method="get" action="/requests"><select name="fn" data-autosubmit>${options}</select> <noscript><button type="submit">Filter</button></noscript></form>
<p class="muted">Newest first, showing ${filtered.length} (log keeps the last 2000 calls).</p>
<table>
<tr><th class="num">#</th><th>Time (UTC)</th><th>Function</th><th>GUID</th><th class="num">ms</th><th class="num">HTTP</th><th>Fault</th><th>XML</th></tr>
${rows}
</table>`
  return layout("Request log", "/requests", body, flash)
}

export function renderError(status: number, message: string) {
  return layout("Error", "", `<h1>Error ${status}</h1><p>${esc(message)}</p><p><a href="/">Back</a></p>`)
}
