import os
import json
import time
import subprocess
from dotenv import load_dotenv
from google import genai
from google.genai import errors

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_KEY:
    raise ValueError("❌ Clé API Gemini manquante dans le fichier .env")

client = genai.Client(api_key=GEMINI_KEY)

MODEL_NAME = "gemini-3.6-flash"
API_DELAY = 4 

DOMAINS_CONFIG = {
    "mechanics": {"manager_name": "Manager Core Mechanics", "folder": "src/mechanics/"},
    "customers": {"manager_name": "Manager Customer & Demand", "folder": "src/customers/"},
    "economy": {"manager_name": "Manager Economy & Operations", "folder": "src/economy/"},
    "ui": {"manager_name": "Manager UI & Visuals", "folder": "src/ui/"}
}

def call_gemini_with_retry(prompt: str, max_retries: int = 6) -> str:
    """Appelle l'API Gemini avec gestion des erreurs 429 (Rate Limit) et 503 (Server Busy)."""
    delay = API_DELAY
    for attempt in range(max_retries):
        try:
            time.sleep(delay)
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return response.text
        except (errors.ClientError, errors.ServerError) as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "503" in err_str or "UNAVAILABLE" in err_str:
                wait_time = delay * (2 ** attempt)
                print(f"⚠️ Serveur occupé ou limite de taux atteinte. Attente de {wait_time}s (Essai {attempt + 1}/{max_retries})...")
                time.sleep(wait_time)
            else:
                raise e
    raise Exception("❌ Échec de l'appel API après plusieurs tentatives de retry.")

def run_powershell(command: str) -> tuple[int, str]:
    try:
        result = subprocess.run(
            ["powershell", "-Command", command],
            capture_output=True,
            text=True,
            timeout=120
        )
        output = result.stdout if result.returncode == 0 else f"{result.stdout}\n{result.stderr}"
        return result.returncode, output
    except Exception as e:
        return 1, str(e)

def director_create_spec(task: dict) -> str:
    print(f"\n🧠 [DIRECTEUR - GEMINI 3.6 FLASH] Analyse de la tâche {task['id']} : {task['title']}...")
    prompt = f"""Tu es le Directeur Architecte du jeu 'Hospitality Lab'.
Tâche à planifier :
- Titre : {task['title']}
- Domaine : {task['domain']}
- Description : {task['description']}
- Fichier cible : {task['target_file']}
- Fichier de test : {task['test_file']}

Rédige une spécification technique courte et ultra-précise pour le Worker.
Détaille les fonctions à exporter, la structure de données et les règles métier à respecter.
Format : Markdown pur."""

    return call_gemini_with_retry(prompt)

def worker_generate_code(spec: str, domain_info: dict, target_file: str) -> str:
    print(f"🛠️ [{domain_info['manager_name'].upper()} - GEMINI 3.6 FLASH] Écriture du code pour {target_file}...")
    prompt = f"""Tu es un Développeur Expert (Worker) sous la responsabilité du {domain_info['manager_name']}.
Voici la spécification technique rédigée par le Directeur :

{spec}

Génère le code JavaScript/ES6 (ou JSX si fichier .jsx) complet pour le fichier `{target_file}`.
Règles :
- Code propre, robuste et immédiatement utilisable.
- Retourne UNIQUEMENT le bloc de code dans un bloc markdown ```javascript ou ```jsx."""

    raw_text = call_gemini_with_retry(prompt)
    
    if "```" in raw_text:
        lines = raw_text.splitlines()
        code_lines = []
        inside = False
        for line in lines:
            if line.startswith("```"):
                inside = not inside
                continue
            if inside:
                code_lines.append(line)
        return "\n".join(code_lines)
    return raw_text

def worker_generate_test(target_code: str, test_file: str) -> str:
    print(f"🧪 [WORKER TESTER - GEMINI 3.6 FLASH] Génération du test pour {test_file}...")
    prompt = f"""Tu es un Expert QA/Testing.
Voici le code source du module à tester :

{target_code}

Rédige un fichier de test complet avec `vitest` (import {{ describe, it, expect }} from 'vitest') pour `{test_file}`.
Exporte les tests nécessaires pour valider l'ensemble des fonctionnalités.
Retourne UNIQUEMENT le code de test sans explication."""

    raw_text = call_gemini_with_retry(prompt)
    if "```" in raw_text:
        lines = raw_text.splitlines()
        code_lines = []
        inside = False
        for line in lines:
            if line.startswith("```"):
                inside = not inside
                continue
            if inside:
                code_lines.append(line)
        return "\n".join(code_lines)
    return raw_text

def execute_task_loop(task: dict):
    domain_info = DOMAINS_CONFIG[task['domain']]
    spec = director_create_spec(task)
    
    code = worker_generate_code(spec, domain_info, task['target_file'])
    os.makedirs(os.path.dirname(task['target_file']), exist_ok=True)
    with open(task['target_file'], "w", encoding="utf-8") as f:
        f.write(code)
    
    test_code = worker_generate_test(code, task['test_file'])
    os.makedirs(os.path.dirname(task['test_file']), exist_ok=True)
    with open(task['test_file'], "w", encoding="utf-8") as f:
        f.write(test_code)
        
    for attempt in range(1, 4):
        print(f"⚡ [POWERSHELL] Lancement des tests (Essai {attempt}/3)...")
        cmd = f"npx vitest run {task['test_file']}"
        code_exit, logs = run_powershell(cmd)
        
        if code_exit == 0:
            print(f"✅ [SUCCÈS] La tâche {task['id']} est validée par les tests !")
            task['status'] = "DONE"
            return True
        else:
            print(f"⚠️ [ÉCHEC] Erreur détectée dans Vitest sur l'essai {attempt}. Relance de Gemini pour correction...")
            fix_prompt = f"""Le test Vitest a échoué avec les erreurs suivantes :
{logs}

Code source actuel ({task['target_file']}) :
{code}

Corrige le code source pour corriger l'erreur.
Retourne UNIQUEMENT le code corrigé."""
            code = call_gemini_with_retry(fix_prompt)
            if "```" in code:
                lines = code.splitlines()
                code = "\n".join([l for l in lines if not l.startswith("```")])
            with open(task['target_file'], "w", encoding="utf-8") as f:
                f.write(code)
                
    print(f"❌ [ABANDON] Impossible de valider {task['id']} après 3 essais.")
    return False

def main():
    print("🚀 Démarrage de l'Espace de Travail Autonome (Gemini 3.6 Flash - Retry 429 & 503)")
    
    with open("project_roadmap.json", "r", encoding="utf-8-sig") as f:
        roadmap = json.load(f)
        
    for task in roadmap['tasks']:
        if task['status'] == "TODO":
            success = execute_task_loop(task)
            if success:
                with open("project_roadmap.json", "w", encoding="utf-8") as f_out:
                    json.dump(roadmap, f_out, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()