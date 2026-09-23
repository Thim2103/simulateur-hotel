import { render, screen, fireEvent, within } from "@testing-library/react";
import TfeFeasibilityPanel from "./TfeFeasibilityPanel";
import TfeFeasibilityModal from "./TfeFeasibilityModal";
import { purchaseItems } from "../../lib/suppliers/suppliersEngine";
import { itemById } from "../../lib/suppliers/suppliersData";

const hotel = (extra = {}) => ({ finance: { revenue: [35000], costs: [0], payroll: 9000, fixedCosts: 4000 }, expansion: { availableCapital: 0 }, ...extra });
const restaurant = (extra = {}) => ({ finance: { revenue: [0], costs: [0] }, staff: [], ...extra });
const rooms = [{ id: 1, number: "101", type: "standard", price: 120, status: "libre" }];
const panel = (hotelState = hotel(), day = 0) => render(<TfeFeasibilityPanel hotelState={hotelState} restaurantState={restaurant()} rooms={rooms} day={day} />);

describe("TfeFeasibilityPanel / the tabs", () => {
  it("opens on the financing plan", () => {
    panel();
    expect(screen.getByTestId("tfe-tab-financing")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("tfe-needs-card")).toBeInTheDocument();
    expect(screen.queryByTestId("tfe-depreciation-summary")).not.toBeInTheDocument();
  });

  it("switches to the depreciation schedule", () => {
    panel();
    fireEvent.click(screen.getByTestId("tfe-tab-depreciation"));
    expect(screen.getByTestId("tfe-tab-depreciation")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("tfe-depreciation-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("tfe-needs-card")).not.toBeInTheDocument();
  });

  it("switches to the Partie 2 tabs: CHAFFs, cash-flow, ratios & KPIs", () => {
    panel();
    fireEvent.click(screen.getByTestId("tfe-tab-chaffs"));
    expect(screen.getByTestId("tfe-chaffs-card")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tfe-tab-cashflow"));
    expect(screen.getByTestId("tfe-cashflow-card")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tfe-tab-ratios"));
    expect(screen.getByTestId("tfe-ratios-card")).toBeInTheDocument();
  });
});

describe("TfeFeasibilityPanel / le plan de financement", () => {
  it("un hôtel neuf n'a besoin que de ses frais d'établissement et de son BFR", () => {
    panel();
    expect(screen.getByTestId("tfe-needs-corporelles")).toHaveTextContent("0");
    expect(screen.getByTestId("tfe-needs-frais")).toHaveTextContent("1 500");
    expect(screen.getByTestId("tfe-needs-bfr")).toHaveTextContent("13 000");
  });

  it("l'apport personnel finance le tout, et le bilan initial s'équilibre", () => {
    panel();
    expect(screen.getByTestId("tfe-resources-apport")).toHaveTextContent("35 000");
    expect(screen.getByTestId("tfe-financing-check")).toHaveTextContent("suffisant");
    expect(screen.getByTestId("tfe-balance-check")).toHaveTextContent("équilibré");
  });

  it("reflète un achat d'équipement dans les besoins corporels", () => {
    const item = itemById("furniture-rooms-entry");
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 1 }], { day: 1 }).hotelState;
    panel(state, 1);
    expect(screen.getByTestId("tfe-needs-corporelles")).toHaveTextContent("520");
  });

  it("prévient quand le financement ne suffit pas", () => {
    panel(hotel({ finance: { revenue: [100], costs: [0], payroll: 9000, fixedCosts: 4000 } }));
    expect(screen.getByTestId("tfe-financing-check")).toHaveTextContent("insuffisant");
  });
});

describe("TfeFeasibilityPanel / le tableau des amortissements", () => {
  it("montre chaque classe TFE à zéro sans achat", () => {
    panel();
    fireEvent.click(screen.getByTestId("tfe-tab-depreciation"));
    expect(screen.getByTestId("tfe-depreciation-class-24")).toHaveTextContent("Mobilier");
    expect(screen.getByTestId("tfe-depreciation-detail")).toHaveTextContent("Aucun équipement acheté");
  });

  it("liste l'équipement acheté avec sa durée, son taux et sa dotation", () => {
    const item = itemById("furniture-rooms-entry");
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 1 }], { day: 1 }).hotelState;
    panel(state, 1);
    fireEvent.click(screen.getByTestId("tfe-tab-depreciation"));
    const classRow = screen.getByTestId("tfe-depreciation-class-24");
    expect(classRow).toHaveTextContent("520"); // VA
    expect(within(screen.getByTestId("tfe-depreciation-detail")).getByText(/10 ans · taux 10 %/)).toBeInTheDocument();
  });
});

describe("TfeFeasibilityModal", () => {
  const modal = (props = {}) => render(<TfeFeasibilityModal hotelState={hotel()} day={0} onClose={jest.fn()} {...props} />);

  it("opens as a dialog with the panel, carrying the vip tone", () => {
    modal();
    const dialog = screen.getByRole("dialog", { name: /plan de faisabilité tfe/i });
    // eslint-disable-next-line testing-library/no-node-access -- the tone sits on the modal's own surface
    expect(dialog.firstChild).toHaveAttribute("data-tone", "vip");
    expect(within(dialog).getByTestId("tfe-feasibility-panel")).toBeInTheDocument();
  });

  it("closes", () => {
    const onClose = jest.fn();
    modal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
