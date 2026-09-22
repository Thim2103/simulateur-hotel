import { render, screen, fireEvent, within } from "@testing-library/react";
import MajorProjectsPanel from "./MajorProjectsPanel";
import HotelExpansionModal from "./HotelExpansionModal";
import { startProject, advanceMajorProjects, PROJECTS } from "../../lib/expansion/majorProjectsEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, structure: { starRating: 3 }, expansion: { availableCapital: 0 }, ...extra });
const rooms = [{ id: 1, number: "101", type: "standard", price: 100, capacity: 2, status: "libre" }];
const running = (id, options = {}, extra = {}) => startProject({ hotelState: hotel(extra), rooms }, id, { day: 3, ...options }).hotelState;
const built = (id, options = {}) => advanceMajorProjects({ hotelState: running(id, options), rooms }, { day: 30 });
const panel = (hotelState = hotel(), props = {}) => render(<MajorProjectsPanel hotelState={hotelState} rooms={rooms} day={3} onStart={jest.fn()} {...props} />);
const compact = (text) => text.replace(/\s| | /g, "");

describe("MajorProjectsPanel / the ranking", () => {
  it("shows the hotel's stars and what it takes to gain one", () => {
    panel();
    expect(screen.getByTestId("projects-stars")).toHaveTextContent("3★");
    expect(screen.getByTestId("projects-stars-next")).toHaveTextContent("Encore 2 projets pour passer 4★");
  });

  it("counts down as projects are delivered", () => {
    const { hotelState } = built("eco");
    panel(hotelState);
    expect(screen.getByTestId("projects-stars")).toHaveTextContent("3,5★");
    expect(screen.getByTestId("projects-stars-next")).toHaveTextContent("Encore 1 projet pour passer 4★");
    expect(screen.getByText(/1 grand chantier livré/)).toBeInTheDocument();
  });

  it("says when the top is reached", () => {
    panel({ ...hotel({ structure: { starRating: 5 } }) });
    expect(screen.getByTestId("projects-stars-next")).toHaveTextContent("Classement maximal");
  });

  it("counts the rooms of the new wing", () => {
    const { hotelState, rooms: after } = built("wing", { size: 10 });
    render(<MajorProjectsPanel hotelState={hotelState} rooms={after} day={30} onStart={jest.fn()} />);
    expect(screen.getByText(/10 chambres dans la nouvelle aile/)).toBeInTheDocument();
  });
});

describe("MajorProjectsPanel / the three projects", () => {
  it("lists the wing, the spa and the renovation, each with its cost, its works and what it brings", () => {
    panel();
    ["wing", "spa", "eco"].forEach((id) => {
      const card = screen.getByTestId(`project-${id}`);
      expect(card).toHaveTextContent(PROJECTS[id].label);
      expect(card).toHaveTextContent(`${PROJECTS[id].days} jours de travaux`);
      PROJECTS[id].effects.forEach((effect) => expect(card).toHaveTextContent(effect));
    });
    expect(compact(screen.getByTestId("project-start-spa").textContent)).toContain("120000€");
    expect(compact(screen.getByTestId("project-start-eco").textContent)).toContain("50000€");
  });

  it("tells what each does to the stars", () => {
    panel();
    expect(screen.getByTestId("project-stars-spa")).toHaveTextContent("Hôtel 3,5★ une fois livré");
  });

  it("lets the player choose the wing's size, and prices it", () => {
    panel();
    const select = screen.getByTestId("project-size-wing");
    expect(within(select).getAllByRole("option").map((option) => option.textContent.replace(/\s| | /g, ""))).toEqual(["10chambres·75000€", "15chambres·112500€", "20chambres·150000€"]);
    expect(compact(screen.getByTestId("project-start-wing").textContent)).toContain("75000€");
    fireEvent.change(select, { target: { value: "20" } });
    expect(compact(screen.getByTestId("project-start-wing").textContent)).toContain("150000€");
  });

  it("starts the wing at the size chosen", () => {
    const onStart = jest.fn();
    panel(hotel(), { onStart });
    fireEvent.change(screen.getByTestId("project-size-wing"), { target: { value: "15" } });
    fireEvent.click(screen.getByTestId("project-start-wing"));
    expect(onStart).toHaveBeenCalledWith("wing", 15);
  });

  it("starts the others without a size", () => {
    const onStart = jest.fn();
    panel(hotel(), { onStart });
    fireEvent.click(screen.getByTestId("project-start-spa"));
    expect(onStart).toHaveBeenLastCalledWith("spa", undefined);
    fireEvent.click(screen.getByTestId("project-start-eco"));
    expect(onStart).toHaveBeenLastCalledWith("eco", undefined);
  });

  it("locks what the treasury cannot pay, and says why", () => {
    panel(hotel({ finance: { revenue: [50000], costs: [0] } }));
    expect(screen.getByTestId("project-start-spa")).toBeDisabled();
    expect(screen.getByTestId("project-reason-spa")).toHaveTextContent("Trésorerie insuffisante");
    expect(screen.getByTestId("project-start-eco")).toBeEnabled();
    // The smallest wing costs 75 000.
    expect(screen.getByTestId("project-start-wing")).toBeDisabled();
  });

  it("locks a wing too big for the treasury while a smaller one is still possible", () => {
    panel(hotel({ finance: { revenue: [90000], costs: [0] } }));
    expect(screen.getByTestId("project-start-wing")).toBeEnabled();
    fireEvent.change(screen.getByTestId("project-size-wing"), { target: { value: "20" } });
    expect(screen.getByTestId("project-start-wing")).toBeDisabled();
    expect(screen.getByTestId("project-reason-wing")).toHaveTextContent("Trésorerie insuffisante");
  });

  it("locks a project the treasury alone doesn't cover 30 % of, even if the capital pot could pay it all", () => {
    panel(hotel({ finance: { revenue: [5000], costs: [0] }, expansion: { availableCapital: 55000 } }));
    expect(screen.getByTestId("project-start-eco")).toBeDisabled();
    expect(screen.getByTestId("project-reason-eco")).toHaveTextContent("Apport personnel insuffisant");
  });
});

describe("MajorProjectsPanel / works in progress", () => {
  it("shows the progress and the days left, in real time", () => {
    panel(running("spa"), { day: 6 });
    const card = screen.getByTestId("project-spa");
    expect(card).toHaveAttribute("data-status", "in-progress");
    expect(within(card).getByRole("meter", { name: /avancement des travaux : espace bien-être/i })).toHaveAttribute("aria-valuenow", "43");
    expect(card).toHaveTextContent("43 % · 4 jours restants");
    expect(screen.queryByTestId("project-start-spa")).not.toBeInTheDocument();
  });

  it("follows the days", () => {
    const { rerender } = panel(running("eco"), { day: 3 });
    expect(screen.getByRole("meter", { name: /travaux/i })).toHaveAttribute("aria-valuenow", "0");
    rerender(<MajorProjectsPanel hotelState={running("eco")} rooms={rooms} day={5} onStart={jest.fn()} />);
    expect(screen.getByRole("meter", { name: /travaux/i })).toHaveAttribute("aria-valuenow", "67");
    rerender(<MajorProjectsPanel hotelState={running("eco")} rooms={rooms} day={6} onStart={jest.fn()} />);
    expect(screen.getByTestId("project-eco")).toHaveTextContent("livraison imminente");
  });

  it("the others cannot be started meanwhile: one at a time", () => {
    panel(running("spa"), { day: 4 });
    expect(screen.getByTestId("project-start-eco")).toBeDisabled();
    expect(screen.getByTestId("project-reason-eco")).toHaveTextContent("un seul à la fois");
    expect(screen.getByTestId("project-start-wing")).toBeDisabled();
  });

  it("a wing under way shows its own duration", () => {
    panel(running("wing", { size: 15 }), { day: 4 });
    expect(screen.getByTestId("project-wing")).toHaveTextContent("5 jours de travaux");
    expect(screen.queryByTestId("project-size-wing")).not.toBeInTheDocument();
  });
});

describe("MajorProjectsPanel / delivered", () => {
  it("marks the project as done, and takes away its button", () => {
    const { hotelState } = built("eco");
    panel(hotelState);
    expect(screen.getByTestId("project-built-eco")).toHaveTextContent("✅ Terminé");
    expect(screen.getByTestId("project-eco")).toHaveAttribute("data-status", "built");
    expect(screen.queryByTestId("project-start-eco")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-start-spa")).toBeEnabled();
  });

  it("says how big the wing is", () => {
    const { hotelState } = built("wing", { size: 20 });
    panel(hotelState);
    expect(screen.getByTestId("project-built-wing")).toHaveTextContent("20 chambres");
  });
});

describe("HotelExpansionModal", () => {
  const modal = (props = {}) => render(<HotelExpansionModal hotelState={hotel()} rooms={rooms} day={3} onStart={jest.fn()} onClose={jest.fn()} {...props} />);

  it("opens as a dialog with the panel", () => {
    modal();
    const dialog = screen.getByRole("dialog", { name: /chantiers & extensions/i });
    // eslint-disable-next-line testing-library/no-node-access -- the tone sits on the modal's own surface
    expect(dialog.firstChild).toHaveAttribute("data-tone", "vip");
    expect(within(dialog).getByTestId("projects-panel")).toBeInTheDocument();
  });

  it("passes the start through and closes", () => {
    const onStart = jest.fn();
    const onClose = jest.fn();
    modal({ onStart, onClose });
    fireEvent.click(screen.getByTestId("project-start-eco"));
    expect(onStart).toHaveBeenCalledWith("eco", undefined);
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
