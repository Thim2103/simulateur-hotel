import { useState } from "react";
import { BentoCard, SoftButton, StatusBadge } from "../../ui/bento";
import { describeSuppliers, describeCart, MAX_REPUTATION_BONUS, MAX_RSE_BONUS } from "../../lib/suppliers/suppliersEngine";

const euro = (value) => `${Math.round(value).toLocaleString("fr-FR")} €`;

const CLASS_LABEL = { 2: "Immobilisation", 3: "Stock", 6: "Charge" };
const CLASS_TONE = { 2: "action", 3: "mice", 6: "neutral" };

function ItemCard({ item, quantityInCart, onAdd, onRemove }) {
  return (
    <li data-testid={`supplier-item-${item.id}`} data-tone={item.owned ? "success" : "action"} className="flex flex-col gap-2 rounded-2xl border border-l-4 border-[var(--ds-border)] border-l-[var(--tone)] bg-white p-3 shadow-[var(--ds-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">{item.supplierName}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusBadge tone={CLASS_TONE[item.accountClass]} data-testid={`supplier-account-${item.id}`}>
            {CLASS_LABEL[item.accountClass] || "Achat"} · {item.accountCode}
          </StatusBadge>
          {item.owned && <StatusBadge tone="success" data-testid={`supplier-owned-${item.id}`}>✅ Acquis ({item.ownedQuantity})</StatusBadge>}
          {!item.affordable && <StatusBadge tone="danger" data-testid={`supplier-unaffordable-${item.id}`}>Trésorerie insuffisante</StatusBadge>}
        </div>
      </div>
      <p className="text-xs text-slate-600">{item.description}</p>
      <ul className="flex flex-wrap gap-1.5 text-xs text-slate-600">
        {item.impact?.reputation ? <li><StatusBadge tone="vip">⭐ Réputation +{item.impact.reputation}</StatusBadge></li> : null}
        {item.impact?.rse ? <li><StatusBadge tone="success">🌱 RSE +{item.impact.rse}</StatusBadge></li> : null}
        {item.impact?.maintenanceCost ? <li><StatusBadge tone="mice">🔧 Entretien {Math.round(item.impact.maintenanceCost * 100)} %</StatusBadge></li> : null}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {euro(item.price)}
          {(item.deliveryFee || item.installationCost) ? <span className="ml-1 text-xs font-normal text-slate-500">+ {euro((item.deliveryFee || 0) + (item.installationCost || 0))} livraison/pose</span> : null}
        </p>
        <div className="flex items-center gap-2">
          {quantityInCart > 0 && (
            <>
              <button type="button" data-testid={`supplier-remove-${item.id}`} onClick={() => onRemove(item.id)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                −
              </button>
              <span data-testid={`supplier-qty-${item.id}`} className="text-xs font-semibold text-slate-700">{quantityInCart}</span>
            </>
          )}
          {/* Adding is always possible -- comparing items in the cart is
              part of the point; the order is blocked at "Valider la
              commande" instead, once the whole cart is priced. */}
          <SoftButton tone="action" icon="🛒" data-testid={`supplier-add-${item.id}`} onClick={() => onAdd(item.id)} className="!px-3 !py-1.5 !text-xs">
            Ajouter
          </SoftButton>
        </div>
      </div>
    </li>
  );
}

// The equipment & supplies desk (see lib/suppliers/suppliersEngine.js):
// catalogue tabs by category, a price-range filter, a cart, and the
// standing/RSE/réputation gains what's already owned brings.
// `onPurchase(cart)` places the order -- Dashboard.jsx wires it through
// applyHotelAdjustment(). Shared by SuppliersModal.
export default function SuppliersPanel({ hotelState, onPurchase }) {
  const [category, setCategory] = useState(null);
  const [tier, setTier] = useState(null);
  const [cart, setCart] = useState([]);

  const described = describeSuppliers(hotelState, { category: category || undefined, tier: tier || undefined });
  const pricedCart = describeCart(hotelState, cart);
  const cartLines = pricedCart.lines;

  const addToCart = (itemId) => {
    setCart((current) => {
      const existing = current.find((line) => line.itemId === itemId);
      if (existing) return current.map((line) => (line.itemId === itemId ? { ...line, quantity: line.quantity + 1 } : line));
      return [...current, { itemId, quantity: 1 }];
    });
  };
  const removeFromCart = (itemId) => {
    setCart((current) =>
      current
        .map((line) => (line.itemId === itemId ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0)
    );
  };
  const validate = () => {
    onPurchase?.(cart);
    setCart([]);
  };

  return (
    <div data-testid="suppliers-panel" className="flex flex-col gap-4">
      <BentoCard as="div" tone="action" title="Bonus des équipements possédés" icon="📦">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="vip" data-testid="suppliers-effect-reputation">⭐ Réputation +{described.effects.reputationBonus} (max {MAX_REPUTATION_BONUS})</StatusBadge>
          <StatusBadge tone="success" data-testid="suppliers-effect-rse">🌱 RSE +{described.effects.rseBonus} (max {MAX_RSE_BONUS})</StatusBadge>
          <StatusBadge tone="mice" data-testid="suppliers-effect-maintenance">🔧 Entretien × {described.effects.maintenanceFactor}</StatusBadge>
        </div>
      </BentoCard>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Catégories de fournisseurs">
        {described.categories.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            data-testid={`suppliers-tab-${item.id}`}
            onClick={() => setCategory(category === item.id ? null : item.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${category === item.id ? "border-[var(--ds-action)] bg-[var(--ds-action)]/10 text-[var(--ds-action)]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {described.tiers.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`suppliers-tier-${item.id}`}
            aria-pressed={tier === item.id}
            onClick={() => setTier(tier === item.id ? null : item.id)}
            className={`rounded-xl border px-3 py-1 text-xs font-medium transition-colors ${tier === item.id ? "border-[var(--ds-vip)] bg-[var(--ds-vip)]/10 text-[var(--ds-vip)]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <ul className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto">
        {described.catalogue.map((item) => (
          <ItemCard key={item.id} item={item} quantityInCart={cart.find((line) => line.itemId === item.id)?.quantity || 0} onAdd={addToCart} onRemove={removeFromCart} />
        ))}
        {described.catalogue.length === 0 && <p className="text-sm text-slate-500">Aucun article dans cette sélection.</p>}
      </ul>

      <BentoCard as="div" tone="success" title="Panier" icon="🛒" data-testid="suppliers-cart">
        {cartLines.length === 0 ? (
          <p className="text-sm text-slate-500">Le panier est vide.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {cartLines.map((line) => (
              <li key={line.itemId} data-testid={`suppliers-cart-line-${line.itemId}`} className="flex items-center justify-between text-sm text-slate-700">
                <span>{line.name} × {line.quantity}</span>
                <span>{euro(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p data-testid="suppliers-cart-total" className="text-sm font-semibold text-slate-900">Total : {euro(pricedCart.total)}</p>
          <SoftButton tone="success" icon="✅" data-testid="suppliers-checkout" disabled={!pricedCart.affordable} onClick={validate}>
            Valider la commande
          </SoftButton>
        </div>
        {pricedCart.reason && cartLines.length > 0 && (
          <p data-testid="suppliers-cart-reason" className="mt-1 text-xs text-rose-700">{pricedCart.reason}</p>
        )}
      </BentoCard>
    </div>
  );
}
