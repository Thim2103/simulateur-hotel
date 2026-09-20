import { render, screen, fireEvent } from "@testing-library/react";
import { BentoCard, MetricDonut, SoftButton, Sparkline, StatusBadge } from "./index";
import { toneOf, BENTO_COLORS } from "../designSystem/bentoTokens";

describe("design tokens", () => {
  it("carries the four accents of the design brief", () => {
    expect(BENTO_COLORS).toMatchObject({ canvas: "#F8FAFC", success: "#10B981", action: "#3B82F6", vip: "#F59E0B", mice: "#8B5CF6" });
  });

  it("falls back to a neutral tone for one it does not know", () => {
    expect(toneOf("mice")).toBe("mice");
    expect(toneOf("nope")).toBe("neutral");
    expect(toneOf(undefined, "action")).toBe("action");
  });
});

describe("BentoCard", () => {
  it("renders a titled card with its tone, icon and content", () => {
    render(
      <BentoCard title="Résumé" icon="🧭" tone="vip" data-testid="card">
        <p>Contenu</p>
      </BentoCard>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("bento-card");
    expect(card).toHaveAttribute("data-tone", "vip");
    expect(screen.getByRole("heading", { level: 2, name: "Résumé" })).toBeInTheDocument();
    expect(screen.getByText("Contenu")).toBeInTheDocument();
  });

  it("has no tone edge and no heading unless asked", () => {
    render(<BentoCard data-testid="card">Seul</BentoCard>);
    expect(screen.getByTestId("card")).not.toHaveAttribute("data-tone");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("spans the columns it is given", () => {
    render(<BentoCard span={2} data-testid="card">x</BentoCard>);
    expect(screen.getByTestId("card")).toHaveClass("lg:col-span-2");
  });

  it("shows an action next to the title", () => {
    render(<BentoCard title="T" action={<button type="button">Plus</button>}>x</BentoCard>);
    expect(screen.getByRole("button", { name: "Plus" })).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("is a tinted pill with a decorative icon", () => {
    render(<StatusBadge tone="success" icon="✅">Actif</StatusBadge>);
    const badge = screen.getByText("Actif").closest(".badge-status");
    expect(badge).toHaveAttribute("data-tone", "success");
    expect(badge).toHaveTextContent("✅Actif");
  });

  it("is neutral by default", () => {
    render(<StatusBadge>Ok</StatusBadge>);
    expect(screen.getByText("Ok")).toHaveAttribute("data-tone", "neutral");
  });
});

describe("MetricDonut", () => {
  it("announces its reading and draws the share", () => {
    render(<MetricDonut value={75} label="Occupation" caption="occupées" tone="success" />);
    const donut = screen.getByRole("img", { name: "Occupation : 75 %" });
    expect(donut).toHaveAttribute("data-percent", "75");
    expect(donut.style.getPropertyValue("--pct")).toBe("75");
    expect(donut).toHaveAttribute("data-tone", "success");
  });

  it("is clamped between 0 and 100 %", () => {
    const { rerender } = render(<MetricDonut value={250} label="A" />);
    expect(screen.getByRole("img", { name: "A : 100 %" })).toBeInTheDocument();
    rerender(<MetricDonut value={-5} label="A" />);
    expect(screen.getByRole("img", { name: "A : 0 %" })).toBeInTheDocument();
  });

  it("scales to its own maximum and can show another reading", () => {
    render(<MetricDonut value={4} max={5} label="Note" display="4/5" />);
    const donut = screen.getByRole("img", { name: "Note : 4/5" });
    expect(donut).toHaveAttribute("data-percent", "80");
  });

  it("does not break on a maximum of 0", () => {
    render(<MetricDonut value={3} max={0} label="Vide" />);
    expect(screen.getByRole("img", { name: "Vide : 0 %" })).toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  it("draws a line through the series", () => {
    render(<Sparkline values={[10, 20, 15, 30]} label="Revenus" />);
    const chart = screen.getByRole("img", { name: "Revenus" });
    expect(chart.querySelector("polyline").getAttribute("points").split(" ")).toHaveLength(4);
  });

  it("draws nothing for fewer than two points, or junk", () => {
    const { container, rerender } = render(<Sparkline values={[10]} label="x" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<Sparkline values={undefined} label="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("copes with a flat series", () => {
    render(<Sparkline values={[5, 5, 5]} label="Plat" />);
    expect(screen.getByRole("img", { name: "Plat" }).querySelector("polyline").getAttribute("points")).not.toMatch(/NaN/);
  });
});

describe("SoftButton", () => {
  it("is a button that calls its handler", () => {
    const onClick = jest.fn();
    render(<SoftButton tone="mice" icon="📣" onClick={onClick}>Lancer</SoftButton>);
    const button = screen.getByRole("button", { name: "Lancer" });
    expect(button).toHaveClass("btn-soft-primary");
    expect(button).toHaveAttribute("data-tone", "mice");
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can render another element, such as a link", () => {
    render(<SoftButton as="a" href="/x">Aller</SoftButton>);
    expect(screen.getByRole("link", { name: "Aller" })).toHaveAttribute("href", "/x");
  });

  it("does not fire when disabled", () => {
    const onClick = jest.fn();
    render(<SoftButton disabled onClick={onClick}>Non</SoftButton>);
    fireEvent.click(screen.getByRole("button", { name: "Non" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
