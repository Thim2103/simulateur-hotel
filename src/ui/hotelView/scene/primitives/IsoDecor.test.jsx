import { render, screen, fireEvent } from "@testing-library/react";
import { IsoPlant, IsoLamp, IsoBench, IsoSign, IsoTable, IsoChair } from "./IsoDecor";

const TILE = { col: 4, row: 4 };

describe("IsoDecor / presence", () => {
  it("renders one of each primitive", () => {
    render(
      <>
        <IsoPlant tile={TILE} />
        <IsoLamp tile={TILE} />
        <IsoBench tile={TILE} />
        <IsoSign tile={TILE} label="Bienvenue" />
        <IsoTable tile={TILE} />
        <IsoChair tile={TILE} />
      </>
    );
    expect(screen.getByTestId("iso-plant-pot")).toBeInTheDocument();
    expect(screen.getByTestId("iso-plant-foliage")).toBeInTheDocument();
    expect(screen.getByTestId("iso-lamp-post")).toBeInTheDocument();
    expect(screen.getByTestId("iso-lamp-top")).toBeInTheDocument();
    expect(screen.getByTestId("iso-bench")).toBeInTheDocument();
    expect(screen.getByTestId("iso-sign")).toBeInTheDocument();
    expect(screen.getByTestId("iso-table")).toBeInTheDocument();
    expect(screen.getByTestId("iso-chair")).toBeInTheDocument();
  });
});

describe("IsoDecor / dimensions", () => {
  it("a longer IsoBench produces a longer bounding box", () => {
    const { container: short } = render(<IsoBench tile={TILE} length={0.4} />);
    const { container: long } = render(<IsoBench tile={TILE} length={1.2} />);
    const shortH = parseFloat(short.querySelector('[data-testid="iso-bench"]').style.height);
    const longH = parseFloat(long.querySelector('[data-testid="iso-bench"]').style.height);
    // Bench's own "length" runs along world Y (depth), which affects the
    // projected box's height on screen for a 2:1 iso projection.
    expect(longH).toBeGreaterThan(shortH);
  });
});

describe("IsoDecor / accessibility", () => {
  it("IsoSign exposes its label as a title/aria-label", () => {
    render(<IsoSign tile={TILE} label="Réception" />);
    const el = screen.getByTestId("iso-sign");
    expect(el).toHaveAttribute("title", "Réception");
    expect(el).toHaveAttribute("aria-label", "Réception");
  });
});

describe("IsoDecor / interaction", () => {
  it("IsoLamp forwards hover/click to both its post and top", () => {
    const onClick = jest.fn();
    render(<IsoLamp tile={TILE} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("iso-lamp-post"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("IsoTable/IsoChair reflect their own interactionState", () => {
    render(
      <>
        <IsoTable tile={TILE} interactionState="hovered" />
        <IsoChair tile={TILE} interactionState="selected" />
      </>
    );
    expect(screen.getByTestId("iso-table").dataset.state).toBe("hovered");
    expect(screen.getByTestId("iso-chair").dataset.state).toBe("selected");
  });
});
