import { render, screen, fireEvent, within } from "@testing-library/react";
import { MediaCrisisBanner, RehabBanner } from "./MediaCrisisBanner";
import MediaCrisisModal from "./MediaCrisisModal";
import { advanceMediaCrisis, respondToCrisis, describeActiveCrisis, describeRehab, activeCrisis, APOLOGY_COST, AUDIT_COST } from "../../lib/mediaCrisis/mediaCrisisEngine";

const ONSET = "2026-09-24";
const TODAY = "2026-09-25";
const rich = (treasury = 50000) => ({
  finance: { revenue: [treasury], costs: [0] },
  progression: { player: { reputation: 70 } },
  hotelEvents: { today: null, audits: [{ id: `audit:${ONSET}`, day: 10, date: ONSET, score: 30, outcome: "warning", reputation: -4, untilDay: 25 }] },
});
const broken = (treasury) => advanceMediaCrisis(rich(treasury), { date: ONSET, day: 10 });
const answer = (state, type) => respondToCrisis({ hotelState: state }, type, { date: TODAY, day: 11 }).hotelState;

const renderModal = (hotelState = broken(), props = {}) => render(<MediaCrisisModal hotelState={hotelState} date={TODAY} onRespond={jest.fn()} onClose={jest.fn()} {...props} />);

describe("MediaCrisisBanner", () => {
  it("draws nothing without a crisis", () => {
    const { container } = render(<MediaCrisisBanner crisis={null} onOpen={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is a red alert that beats while the crisis is unanswered", () => {
    const state = broken();
    render(<MediaCrisisBanner crisis={describeActiveCrisis(state, TODAY)} onOpen={jest.fn()} />);
    const banner = screen.getByRole("alert");
    expect(banner).toHaveAttribute("data-testid", "media-crisis-banner");
    expect(banner).toHaveAttribute("data-decided", "false");
    expect(banner).toHaveClass("crisis-blink");
    expect(banner).toHaveAccessibleName(/crise médiatique : intoxication alimentaire au restaurant/i);
  });

  it("says what the crisis costs: reputation, demand, days", () => {
    const state = broken();
    const crisis = activeCrisis(state);
    render(<MediaCrisisBanner crisis={describeActiveCrisis(state, TODAY)} onOpen={jest.fn()} />);
    expect(screen.getByTestId("crisis-banner-reputation")).toHaveTextContent(/^Réputation −\d+ pts$/);
    expect(screen.getByTestId("crisis-banner-demand")).toHaveTextContent(`Demande −${Math.round(crisis.demandDrop * 100)} %`);
    expect(screen.getByTestId("crisis-banner-days")).toHaveTextContent(/\d+ jours? restants?/);
  });

  it("the button opens the desk", () => {
    const onOpen = jest.fn();
    render(<MediaCrisisBanner crisis={describeActiveCrisis(broken(), TODAY)} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Répondre à la crise" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("calms down once the player has answered, and offers to see the strategy", () => {
    const state = answer(broken(), "apology");
    render(<MediaCrisisBanner crisis={describeActiveCrisis(state, TODAY)} onOpen={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveAttribute("data-decided", "true");
    expect(screen.getByRole("alert")).not.toHaveClass("crisis-blink");
    expect(screen.getByRole("button", { name: "Voir la stratégie" })).toBeInTheDocument();
  });
});

describe("RehabBanner", () => {
  it("draws nothing without a campaign", () => {
    const { container } = render(<RehabBanner rehab={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the boost still to come", () => {
    const state = answer(broken(), "audit");
    render(<RehabBanner rehab={describeRehab(state, TODAY)} />);
    const banner = screen.getByTestId("rehab-banner");
    expect(banner).toHaveTextContent("L'hôtel le plus sûr de la ville");
    expect(banner).toHaveTextContent("+15 %");
    expect(banner).toHaveTextContent("encore 10 jours");
  });
});

describe("MediaCrisisModal", () => {
  it("opens as a red dialog and tells the story", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: /crise médiatique/i }).firstChild).toHaveAttribute("data-tone", "danger");
    const summary = screen.getByTestId("crisis-summary");
    expect(summary).toHaveTextContent("Intoxication alimentaire au restaurant");
    expect(summary).toHaveTextContent("un contrôle d'hygiène défavorable");
  });

  it("gives the three ways out, with their price", () => {
    renderModal();
    expect(screen.getByTestId("crisis-option-deny")).toHaveTextContent("Gratuit");
    expect(screen.getByTestId("crisis-option-apology").textContent.replace(/\s| | /g, "")).toContain("2000€");
    expect(screen.getByTestId("crisis-option-audit").textContent.replace(/\s| | /g, "")).toContain("8000€");
    ["deny", "apology", "audit"].forEach((id) => expect(screen.getByTestId(`crisis-choose-${id}`)).toBeEnabled());
  });

  it("says what a statement would do to the length of the crisis", () => {
    const state = broken();
    const left = describeActiveCrisis(state, TODAY).daysLeft;
    renderModal(state);
    expect(screen.getByTestId("crisis-option-apology")).toHaveTextContent(`passerait de ${left} jour${left > 1 ? "s" : ""} à ${Math.ceil(left / 2)}`);
  });

  it("warns that the risk of denying is a counter-expertise", () => {
    renderModal();
    expect(screen.getByTestId("crisis-option-deny")).toHaveTextContent(/contre-expertise/i);
  });

  it("warns about the price of silence until the player answers", () => {
    renderModal();
    expect(screen.getByText(/sans réponse sous deux jours/i)).toBeInTheDocument();
  });

  it.each([["deny"], ["apology"], ["audit"]])("choosing %s gives the answer", (id) => {
    const onRespond = jest.fn();
    renderModal(broken(), { onRespond });
    fireEvent.click(screen.getByTestId(`crisis-choose-${id}`));
    expect(onRespond).toHaveBeenCalledWith(id);
  });

  it("cannot be pressed twice", () => {
    const onRespond = jest.fn();
    renderModal(broken(), { onRespond });
    fireEvent.click(screen.getByTestId("crisis-choose-deny"));
    expect(screen.getByTestId("crisis-choose-deny")).toBeDisabled();
    fireEvent.click(screen.getByTestId("crisis-choose-deny"));
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it("locks a paid answer the treasury cannot pay, and says why", () => {
    renderModal(broken(1000));
    expect(screen.getByTestId("crisis-choose-apology")).toBeDisabled();
    expect(screen.getByTestId("crisis-reason-apology")).toHaveTextContent("Trésorerie insuffisante");
    expect(screen.getByTestId("crisis-choose-deny")).toBeEnabled();
  });

  it("only the audit is out of reach with 5 000 EUR", () => {
    renderModal(broken(5000));
    expect(screen.getByTestId("crisis-choose-apology")).toBeEnabled();
    expect(screen.getByTestId("crisis-choose-audit")).toBeDisabled();
  });

  it("after an answer: the choice is marked, the others are closed, and the outcome is told", () => {
    const state = answer(broken(), "apology");
    renderModal(state);
    expect(screen.getByTestId("crisis-option-apology")).toHaveAttribute("data-chosen", "true");
    expect(screen.getByTestId("crisis-choose-apology")).toHaveTextContent("✓ Choisi");
    expect(screen.getByTestId("crisis-choose-deny")).toBeDisabled();
    expect(screen.getByTestId("crisis-reason-deny")).toHaveTextContent(/déjà répondu/i);
    expect(screen.queryByTestId("crisis-reason-apology")).not.toBeInTheDocument();
    expect(screen.getByTestId("crisis-outcome")).toHaveTextContent(/communiqué publié/i);
    expect(screen.queryByText(/sans réponse sous deux jours/i)).not.toBeInTheDocument();
  });

  it("after the audits: no crisis left, the campaign is announced", () => {
    const state = answer(broken(), "audit");
    renderModal(state);
    expect(screen.getByTestId("crisis-none")).toBeInTheDocument();
    expect(screen.getByTestId("crisis-rehab")).toHaveTextContent("L'hôtel le plus sûr de la ville");
    expect(screen.getByTestId("crisis-outcome")).toHaveTextContent(/audits concluants/i);
    expect(screen.queryByTestId("crisis-option-deny")).not.toBeInTheDocument();
  });

  it("with no crisis at all, says the press is quiet", () => {
    renderModal(rich());
    expect(screen.getByTestId("crisis-none")).toHaveTextContent(/aucune crise en cours/i);
  });

  it("says when a counter-expertise made it worse, and when silence stretched it", () => {
    const state = broken();
    const worse = { ...state, mediaCrisis: { ...state.mediaCrisis, crises: [{ ...activeCrisis(state), worsened: true, silenceExtended: true }] } };
    renderModal(worse);
    expect(screen.getByTestId("crisis-worsened")).toHaveTextContent(/contre-expertise/i);
    expect(screen.getByTestId("crisis-silence")).toHaveTextContent(/silence/i);
  });

  it("closes", () => {
    const onClose = jest.fn();
    renderModal(broken(), { onClose });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("the costs shown are the engine's", () => {
    expect(APOLOGY_COST).toBe(2000);
    expect(AUDIT_COST).toBe(8000);
  });
});
