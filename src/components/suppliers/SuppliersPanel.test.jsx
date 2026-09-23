import { render, screen, fireEvent, within } from "@testing-library/react";
import SuppliersPanel from "./SuppliersPanel";
import SuppliersModal from "./SuppliersModal";
import { purchaseItems } from "../../lib/suppliers/suppliersEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, expansion: { availableCapital: 0 }, ...extra });
const panel = (hotelState = hotel(), props = {}) => render(<SuppliersPanel hotelState={hotelState} onPurchase={jest.fn()} {...props} />);

describe("SuppliersPanel / browsing the catalogue", () => {
  it("lists every category as a tab and every tier as a filter", () => {
    panel();
    ["furniture", "equipment", "tableware", "linens", "electronics", "food", "decor"].forEach((id) => expect(screen.getByTestId(`suppliers-tab-${id}`)).toBeInTheDocument());
    ["entry", "standard", "luxury"].forEach((id) => expect(screen.getByTestId(`suppliers-tier-${id}`)).toBeInTheDocument());
  });

  it("shows the whole catalogue with no filter selected", () => {
    panel();
    expect(screen.getByTestId("supplier-item-furniture-rooms-entry")).toBeInTheDocument();
    expect(screen.getByTestId("supplier-item-food-wine-standard")).toBeInTheDocument();
  });

  it("narrows to one category when its tab is clicked, and shows everything again on a second click", () => {
    panel();
    fireEvent.click(screen.getByTestId("suppliers-tab-linens"));
    expect(screen.queryByTestId("supplier-item-furniture-rooms-entry")).not.toBeInTheDocument();
    expect(screen.getByTestId("supplier-item-linens-sheets-entry")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("suppliers-tab-linens"));
    expect(screen.getByTestId("supplier-item-furniture-rooms-entry")).toBeInTheDocument();
  });

  it("narrows further by price tier", () => {
    panel();
    fireEvent.click(screen.getByTestId("suppliers-tier-luxury"));
    expect(screen.queryByTestId("supplier-item-furniture-rooms-entry")).not.toBeInTheDocument();
    expect(screen.getByTestId("supplier-item-furniture-rooms-luxury")).toBeInTheDocument();
  });

  it("shows the item's supplier, its PCMN account and what it brings", () => {
    panel();
    const card = screen.getByTestId("supplier-item-equipment-climate-luxury");
    expect(card).toHaveTextContent("GreenAir Systems");
    expect(within(card).getByTestId("supplier-account-equipment-climate-luxury")).toHaveTextContent("234");
    expect(card).toHaveTextContent("Réputation +0.15");
    expect(card).toHaveTextContent("RSE +5");
  });

  it("marks an owned item and its quantity", () => {
    const owned = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 3 }], { day: 1 }).hotelState;
    panel(owned);
    expect(screen.getByTestId("supplier-owned-furniture-rooms-entry")).toHaveTextContent("3");
  });

  it("flags what the treasury cannot pay, without blocking adding it to the cart", () => {
    panel(hotel({ finance: { revenue: [10], costs: [0] } }));
    expect(screen.getByTestId("supplier-unaffordable-decor-art-luxury")).toBeInTheDocument();
    expect(screen.getByTestId("supplier-add-decor-art-luxury")).toBeEnabled();
  });
});

describe("SuppliersPanel / the cart", () => {
  it("is empty at first", () => {
    panel();
    expect(screen.getByTestId("suppliers-cart")).toHaveTextContent("Le panier est vide");
    expect(screen.getByTestId("suppliers-checkout")).toBeDisabled();
  });

  it("adding an item shows its line and the total", () => {
    panel();
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    expect(screen.getByTestId("suppliers-cart-line-furniture-rooms-entry")).toHaveTextContent("× 1");
    expect(screen.getByTestId("suppliers-cart-total")).toHaveTextContent("520"); // 420 + 60 + 40
    expect(screen.getByTestId("suppliers-checkout")).toBeEnabled();
  });

  it("adding the same item twice increments its quantity", () => {
    panel();
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    expect(screen.getByTestId("suppliers-cart-line-furniture-rooms-entry")).toHaveTextContent("× 2");
    expect(screen.getByTestId("supplier-qty-furniture-rooms-entry")).toHaveTextContent("2");
  });

  it("removing brings the quantity back down, then drops the line", () => {
    panel();
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    fireEvent.click(screen.getByTestId("supplier-remove-furniture-rooms-entry"));
    expect(screen.getByTestId("supplier-qty-furniture-rooms-entry")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("supplier-remove-furniture-rooms-entry"));
    expect(screen.queryByTestId("suppliers-cart-line-furniture-rooms-entry")).not.toBeInTheDocument();
  });

  it("locks the checkout, and says why, once the cart is too expensive", () => {
    panel(hotel({ finance: { revenue: [1000], costs: [0] } }));
    fireEvent.click(screen.getByTestId("suppliers-tab-decor"));
    fireEvent.click(screen.getByTestId("suppliers-tier-luxury"));
    fireEvent.click(screen.getByTestId("supplier-add-decor-art-luxury")); // 5200 + 120 + 100
    expect(screen.getByTestId("suppliers-checkout")).toBeDisabled();
    expect(screen.getByTestId("suppliers-cart-reason")).toHaveTextContent("Trésorerie insuffisante");
  });

  it("validating calls onPurchase with the cart, and empties it", () => {
    const onPurchase = jest.fn();
    panel(hotel(), { onPurchase });
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    fireEvent.click(screen.getByTestId("supplier-add-linens-sheets-entry"));
    fireEvent.click(screen.getByTestId("suppliers-checkout"));
    expect(onPurchase).toHaveBeenCalledWith([
      { itemId: "furniture-rooms-entry", quantity: 1 },
      { itemId: "linens-sheets-entry", quantity: 1 },
    ]);
    expect(screen.getByTestId("suppliers-cart")).toHaveTextContent("Le panier est vide");
  });
});

describe("SuppliersPanel / the bonuses already owned", () => {
  it("shows neutral badges with nothing bought", () => {
    panel();
    expect(screen.getByTestId("suppliers-effect-reputation")).toHaveTextContent("+0");
    expect(screen.getByTestId("suppliers-effect-rse")).toHaveTextContent("+0");
    expect(screen.getByTestId("suppliers-effect-maintenance")).toHaveTextContent("× 1");
  });

  it("reflects what has been bought", () => {
    const owned = purchaseItems({ hotelState: hotel() }, [{ itemId: "equipment-climate-luxury", quantity: 1 }], { day: 1 }).hotelState;
    panel(owned);
    expect(screen.getByTestId("suppliers-effect-reputation")).toHaveTextContent("+0.15");
    expect(screen.getByTestId("suppliers-effect-rse")).toHaveTextContent("+5");
    expect(screen.getByTestId("suppliers-effect-maintenance")).toHaveTextContent("× 0.9");
  });
});

describe("SuppliersModal", () => {
  const modal = (props = {}) => render(<SuppliersModal hotelState={hotel()} onPurchase={jest.fn()} onClose={jest.fn()} {...props} />);

  it("opens as a dialog with the panel, carrying the action tone", () => {
    modal();
    const dialog = screen.getByRole("dialog", { name: /fournisseurs & catalogue/i });
    // eslint-disable-next-line testing-library/no-node-access -- the tone sits on the modal's own surface
    expect(dialog.firstChild).toHaveAttribute("data-tone", "action");
    expect(within(dialog).getByTestId("suppliers-panel")).toBeInTheDocument();
  });

  it("closes", () => {
    const onClose = jest.fn();
    modal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
