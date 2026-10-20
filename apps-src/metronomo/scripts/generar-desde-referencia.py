import os, json
root = r"C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios\apps-src\metronomo"
os.chdir(root)
s = open("referencia/metronomo.html", encoding="utf-8").read()

def sub(old, new, count=1):
    global s
    assert s.count(old) == count, (s.count(old), old[:70])
    s = s.replace(old, new)

# --- Textos marcados con data-i18n / data-i18n-aria
sub('<p class="touch-hint">Desliza el tempo hacia arriba o abajo</p>', '<p class="touch-hint" data-i18n="hint">Desliza el tempo hacia arriba o abajo</p>')
sub('<span style="opacity:0.5">VOZ B</span>', '<span style="opacity:0.5" data-i18n="voiceB">VOZ B</span>')
for old_label, key in [
    ("Tema visual", "theme"), ("Pantalla completa", "fullscreen"), ("Subdivisiones por pulso", "subdivision"),
    ("Polirritmo de la voz B", "poly"), ("Volumen", "volume"), ("Marcar tempo con toques", "tap"),
    ("Bajar tempo", "bpmDown"), ("Quitar un pulso del compás", "beatDown"), ("Iniciar metrónomo", "start"),
    ("Añadir un pulso al compás", "beatUp"), ("Subir tempo", "bpmUp"),
]:
    sub(f'aria-label="{old_label}"', f'aria-label="{old_label}" data-i18n-aria="{key}"')
sub('<option value="vortex">A - Vórtice</option>', '<option value="vortex" data-i18n="vortex">A - Vórtice</option>')
sub('<option value="membrane">B - Péndulo</option>', '<option value="membrane" data-i18n="membrane">B - Péndulo</option>')
sub('<option value="signal">C - Señal</option>', '<option value="signal" data-i18n="signal">C - Señal</option>')
sub('<div class="brand">METRÓNOMO PRO</div>', '<div class="brand" data-i18n="brand">METRÓNOMO PRO</div>')
sub('<title>Metrónomo Pro</title>', '<title>Metrónomo Pro · Storm Studios</title>')

# --- Diccionario y aplicación del idioma (?lang=es|en), antes del resto del script
I18N = {
    "es": {"hint": "Desliza el tempo hacia arriba o abajo", "voiceB": "VOZ B", "theme": "Tema visual",
           "fullscreen": "Pantalla completa", "subdivision": "Subdivisiones por pulso", "poly": "Polirritmo de la voz B",
           "volume": "Volumen", "tap": "Marcar tempo con toques", "bpmDown": "Bajar tempo",
           "beatDown": "Quitar un pulso del compás", "start": "Iniciar metrónomo", "stop": "Detener metrónomo",
           "beatUp": "Añadir un pulso al compás", "bpmUp": "Subir tempo", "vortex": "A - Vórtice",
           "membrane": "B - Péndulo", "signal": "C - Señal",
           "beat": "Pulso {n}: acento {a}. Toca para cambiarlo", "title": "Metrónomo Pro · Storm Studios", "brand": "METRÓNOMO PRO"},
    "en": {"hint": "Swipe the tempo up or down", "voiceB": "VOICE B", "theme": "Visual theme",
           "fullscreen": "Full screen", "subdivision": "Subdivisions per beat", "poly": "Voice B polyrhythm",
           "volume": "Volume", "tap": "Tap the tempo", "bpmDown": "Slower", "beatDown": "Remove a beat from the bar",
           "start": "Start metronome", "stop": "Stop metronome", "beatUp": "Add a beat to the bar", "bpmUp": "Faster",
           "vortex": "A - Vortex", "membrane": "B - Pendulum", "signal": "C - Signal",
           "beat": "Beat {n}: accent {a}. Tap to change it", "title": "Metronome Pro · Storm Studios", "brand": "METRONOME PRO"},
}
sub('''  <script>
    // ===== STATE MANAGER =====''', '''  <script>
    // ===== IDIOMA (?lang=es|en; el sitio lo pasa al iframe) =====
    const I18N = ''' + json.dumps(I18N, ensure_ascii=False) + ''';
    const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es';
    const t = (key, vars = {}) => (I18N[LANG][key] ?? key).replace(/\\{(\\w+)\\}/g, (_, k) => vars[k] ?? '');
    document.documentElement.lang = LANG;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

    // ===== STATE MANAGER =====''')
sub("dot.setAttribute('aria-label', `Pulso ${i + 1}: acento ${pattern[i]}. Toca para cambiarlo`);",
    "dot.setAttribute('aria-label', t('beat', { n: i + 1, a: pattern[i] }));")
sub("btnPlay.setAttribute('aria-label', audio.isPlaying ? 'Detener metrónomo' : 'Iniciar metrónomo');",
    "btnPlay.setAttribute('aria-label', t(audio.isPlaying ? 'stop' : 'start'));")
# Guardado protegido: en modo privado o con almacenamiento bloqueado, setItem lanza.
sub("localStorage.setItem('metronomo_pro_state_v1', JSON.stringify(this.state));",
    "try { localStorage.setItem('metronomo_pro_state_v1', JSON.stringify(this.state)); } catch (e) { /* sin almacenamiento */ }", 2)

open("index.html", "w", encoding="utf-8").write(s)

os.makedirs("scripts", exist_ok=True)
cd = open(r"..\oido-absoluto-guitarra-juego\scripts\copy-dist.mjs", encoding="utf-8").read()
cd = cd.replace('"oido-absoluto-guitarra-juego"', '"metronomo"')
open("scripts/copy-dist.mjs", "w", encoding="utf-8").write(cd)
open("package.json", "w", encoding="utf-8").write(json.dumps({
    "name": "storm-metronomo", "version": "1.0.0", "private": True, "type": "module",
    "scripts": {"dev": "vite --host 127.0.0.1 --port 5191", "build": "vite build",
                "deploy": "npm run build && node scripts/copy-dist.mjs"},
    "devDependencies": {"vite": "^8.1.0"},
}, indent=2) + "\n")
open("vite.config.mjs", "w", encoding="utf-8").write('''import { defineConfig } from "vite";

// Metrónomo Pro: un solo index.html (script clásico con su propio programador de audio en un Worker).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/apps/metronomo/" : "./",
  build: { outDir: "dist", emptyOutDir: true, target: "es2020" },
  server: { host: "127.0.0.1", port: 5191, strictPort: true },
}));
''')
print("ok")
