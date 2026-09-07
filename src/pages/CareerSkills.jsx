import Card from "../components/ui/Card";
import { useCareerContext } from "../context/CareerContext";
import { SKILL_CATALOG, computeSkillBonuses, skillLabel } from "../lib/career/careerSkills";

export default function CareerSkills() {
  const { careerState } = useCareerContext();

  if (!careerState) {
    return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Démarrez d'abord votre carrière depuis le tableau de bord.</div>;
  }

  const bonuses = computeSkillBonuses(careerState.skills);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Carrière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compétences</h1>
          <p className="mt-1 text-sm text-slate-500">Gagnées via les missions et les choix narratifs.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.keys(SKILL_CATALOG).map((skillId) => {
          const skill = careerState.skills[skillId] || { points: 0, level: 0 };
          const pointsToNextLevel = 10 - (skill.points % 10);
          return (
            <Card key={skillId} title={skillLabel(skillId)}>
              <p className="text-2xl font-bold text-slate-900">Niveau {skill.level}</p>
              <p className="mt-1 text-sm text-slate-500">{skill.points} points · {pointsToNextLevel} avant le niveau suivant</p>
              <p className="mt-3 text-sm text-slate-700">{SKILL_CATALOG[skillId].effectPerLevel}</p>
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="skills-effects" className="flex flex-col gap-3">
        <h2 id="skills-effects" className="text-base font-semibold text-slate-900">Effets actuels sur le gameplay</h2>
        <Card>
          <ul className="flex flex-col gap-2 text-sm text-slate-700">
            <li>Multiplicateur de profit (résumé du jour) : ×{bonuses.profitMultiplier.toFixed(2)}</li>
            <li>Multiplicateur de dépenses (résumé du jour) : ×{bonuses.expenseMultiplier.toFixed(2)}</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
