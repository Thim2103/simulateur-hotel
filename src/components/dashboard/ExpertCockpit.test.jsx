import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ExpertCockpit from "./ExpertCockpit";

const renderCockpit = (props) => render(<ExpertCockpit {...props} />, { wrapper: MemoryRouter });

test("shows all 5 domains from the spec", () => {
  renderCockpit({});
  ["Yield Management & Tarification Avancée", "Comptabilité PCMN & Bilans", "Faisabilité & Projections TFE (3-5 ans)", "RSE & Reporting ESG Détaillé", "Gestion Opérationnelle RH & Housekeeping"].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

test("clicking the Yield card calls onOpenYield", () => {
  const onOpenYield = jest.fn();
  renderCockpit({ onOpenYield });
  fireEvent.click(screen.getByText("Yield Management & Tarification Avancée"));
  expect(onOpenYield).toHaveBeenCalled();
});

test("clicking the Comptabilité card calls onOpenAccounting", () => {
  const onOpenAccounting = jest.fn();
  renderCockpit({ onOpenAccounting });
  fireEvent.click(screen.getByText("Comptabilité PCMN & Bilans"));
  expect(onOpenAccounting).toHaveBeenCalled();
});

test("clicking the Faisabilité TFE card calls onOpenTfeFeasibility", () => {
  const onOpenTfeFeasibility = jest.fn();
  renderCockpit({ onOpenTfeFeasibility });
  fireEvent.click(screen.getByText("Faisabilité & Projections TFE (3-5 ans)"));
  expect(onOpenTfeFeasibility).toHaveBeenCalled();
});

test("the ESG and RH & Housekeeping entries are real links to their own pages", () => {
  renderCockpit({});
  expect(screen.getByText("RSE & Reporting ESG Détaillé").closest("a")).toHaveAttribute("href", "/esg");
  expect(screen.getByText("Gestion Opérationnelle RH & Housekeeping").closest("a")).toHaveAttribute("href", "/management");
});
