import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import { StarRating } from "./index";
import GameModal from "../components/GameModal";

const css = fs.readFileSync(path.join(__dirname, "..", "..", "index.css"), "utf8");

// A component rule that sets `--tone` itself, on the same specificity as the
// `[data-tone="..."]` rules and declared after them, silently overrides every
// tone (every card, badge and button came out blue). The tone variables may be
// set by the [data-tone] rules only; components read them with a fallback.
describe("index.css tones", () => {
  it("sets --tone, --tone-soft and --tone-ink only inside [data-tone] rules", () => {
    const rules = css.split("}");
    const offenders = rules
      .filter((rule) => /--tone(-soft|-ink)?\s*:/.test(rule))
      .filter((rule) => !/\[data-tone="[a-z]+"\]\s*\{/.test(rule))
      .map((rule) => rule.trim().split("{")[0].trim());
    expect(offenders).toEqual([]);
  });

  it("defines the six tones", () => {
    ["action", "success", "vip", "mice", "danger", "neutral"].forEach((tone) => expect(css).toContain(`[data-tone="${tone}"]`));
  });

  it("reads the tone with a fallback where a component uses it", () => {
    expect(css).not.toMatch(/var\(--tone\)/);
  });
});

describe("StarRating", () => {
  it("draws filled and empty stars under one accessible value", () => {
    render(<StarRating rating={3} />);
    const stars = screen.getByLabelText("Note 3 sur 5");
    expect(stars).toHaveTextContent("★★★☆☆");
  });

  it("clamps and rounds", () => {
    const { rerender } = render(<StarRating rating={9} />);
    expect(screen.getByLabelText("Note 5 sur 5")).toHaveTextContent("★★★★★");
    rerender(<StarRating rating={-2} />);
    expect(screen.getByLabelText("Note 0 sur 5")).toHaveTextContent("☆☆☆☆☆");
    rerender(<StarRating rating="x" />);
    expect(screen.getByLabelText("Note 0 sur 5")).toBeInTheDocument();
    rerender(<StarRating rating={3.6} />);
    expect(screen.getByLabelText("Note 4 sur 5")).toBeInTheDocument();
  });
});

describe("GameModal tone", () => {
  it("carries the tone as a coloured top edge", () => {
    render(<GameModal open onClose={() => {}} title="Titre" tone="mice">contenu</GameModal>);
    const dialog = screen.getByRole("dialog", { name: "Titre" });
    expect(dialog.firstChild).toHaveAttribute("data-tone", "mice");
    expect(dialog.firstChild).toHaveClass("border-t-4");
  });

  it("has no edge without a tone", () => {
    render(<GameModal open onClose={() => {}} title="Titre">contenu</GameModal>);
    expect(screen.getByRole("dialog", { name: "Titre" }).firstChild).not.toHaveAttribute("data-tone");
  });
});
