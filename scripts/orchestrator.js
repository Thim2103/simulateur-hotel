import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

// Configuration
const COOL_DOWN_MINUTES = 5; // Temps de pause anti-surchauffe
const BATCH_SIZE = 3;        // Nombre de tâches avant pause
let taskCount = 0;

// Client Gemini
const ai = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) 
  : null;

export async function runTask(taskPrompt) {
  taskCount++;

  // Pause anti-surchauffe
  if (taskCount % BATCH_SIZE === 0) {
    console.log(`\n☕ Pause de refroidissement de ${COOL_DOWN_MINUTES} minutes...`);
    await new Promise(res => setTimeout(res, COOL_DOWN_MINUTES * 60 * 1000));
  }

  try {
    console.log("\n🤖 [Directeur] Exécution avec Claude Code...");
    // Utilisation de --dangerously-skip-permissions pour autoriser les écritures de fichiers
    execSync(`claude --dangerously-skip-permissions --print "${taskPrompt}"`, { stdio: 'inherit' });
    console.log("✅ Tâche terminée avec succès par Claude Code.");
  } catch (error) {
    console.warn("\n⚠️ Quota Claude atteint ou erreur d'exécution. Basculement sur Gemini (Worker)...");
    
    if (!ai) {
      console.error("❌ GEMINI_API_KEY manquante dans le fichier .env");
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Tu es un développeur expert React/JS. Réalise la demande suivante pour le projet SimulateurHotel :\n\n${taskPrompt}`,
      });

      console.log("\n✅ Code généré par Gemini :\n");
      console.log(response.text);
    } catch (geminiError) {
      console.error("❌ Erreur lors du relais vers Gemini :", geminiError);
    }
  }
}

const promptArg = process.argv[2] || "Vérifier la structure du projet";
runTask(promptArg);