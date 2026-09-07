import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAcademyContext } from "../context/AcademyContext";

// Teacher's entry point: list of classes, create a new one, jump into a
// class's groups/scenario. See AcademyClass.jsx for assigning a scenario
// and following group progress.
export default function AcademyDashboard() {
  const { academyState, isRunning, error, loadClassState, createClass } = useAcademyContext();
  const [newClassName, setNewClassName] = useState("");

  useEffect(() => {
    loadClassState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateClass = async (event) => {
    event.preventDefault();
    if (!newClassName.trim()) return;
    try {
      await createClass(newClassName.trim());
      setNewClassName("");
    } catch {
      // error is already surfaced via `error`.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Académie</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mes classes</h1>
          <p className="mt-1 text-sm text-slate-500">Créez une classe, constituez des groupes et assignez-leur un scénario.</p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Une erreur est survenue : {error.message}
        </div>
      )}

      <Card title="Créer une classe">
        <form onSubmit={handleCreateClass} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Nom de la classe" value={newClassName} onChange={(event) => setNewClassName(event.target.value)} placeholder="Ex : BTS Hôtellerie - Promotion 2026" />
          </div>
          <Button type="submit" disabled={isRunning || !newClassName.trim()}>Créer la classe</Button>
        </form>
      </Card>

      <section aria-labelledby="academy-classes" className="flex flex-col gap-3">
        <h2 id="academy-classes" className="text-base font-semibold text-slate-900">Classes</h2>
        {academyState.classes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Aucune classe pour le moment : créez-en une ci-dessus.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {academyState.classes.map((classEntry) => (
              <Card key={classEntry.id} title={classEntry.name}>
                <p className="text-sm text-slate-500">
                  {academyState.groups.filter((group) => group.classId === classEntry.id).length} groupe(s)
                </p>
                <Link to={`/academy/${classEntry.id}`} className="mt-3 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                  Ouvrir la classe →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
