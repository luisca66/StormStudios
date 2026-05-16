import { describe, it, expect } from 'vitest';
import { generarEjercicio, nuevaSemilla } from '../_lib/generador/generador';
import { validarPatron, REGLAS_V1 } from '../_lib/generador/reglas';
import { tiemposDelCompas, tiemposDeDuracion } from '../_lib/generador/tipos';

const MUESTRAS_POR_NIVEL = 50;

// ── Tests por nivel ───────────────────────────────────────────────────────────

for (const regla of REGLAS_V1) {
  describe(`Nivel ${regla.nivel} — ${regla.nombre}`, () => {

    it(`${MUESTRAS_POR_NIVEL} ejercicios: sin violaciones de reglas`, () => {
      const violaciones: string[] = [];

      for (let seed = 1; seed <= MUESTRAS_POR_NIVEL; seed++) {
        const patron = generarEjercicio(seed, regla);
        const errores = validarPatron(patron, regla);

        if (errores.length > 0) {
          violaciones.push(`seed=${seed}: ${errores.join(' | ')}`);
        }
      }

      if (violaciones.length > 0) {
        throw new Error(
          `${violaciones.length} violaciones en nivel ${regla.nivel}:\n` +
          violaciones.slice(0, 5).join('\n') +
          (violaciones.length > 5 ? `\n…y ${violaciones.length - 5} más` : '')
        );
      }

      expect(violaciones).toHaveLength(0);
    });

    it(`${MUESTRAS_POR_NIVEL} ejercicios: figuras solo del conjunto permitido`, () => {
      const permitidas = new Set(regla.figurasPermitidas);
      const ilegales: string[] = [];

      for (let seed = 1; seed <= MUESTRAS_POR_NIVEL; seed++) {
        const patron = generarEjercicio(seed, regla);
        for (let ci = 0; ci < patron.compases.length; ci++) {
          for (const nota of patron.compases[ci]) {
            if (!permitidas.has(nota)) {
              ilegales.push(`seed=${seed} compás ${ci + 1}: figura '${nota}' ilegal`);
            }
          }
        }
      }

      expect(ilegales).toHaveLength(0);
    });

    it(`${MUESTRAS_POR_NIVEL} ejercicios: cada compás suma exactamente sus tiempos`, () => {
      const errores: string[] = [];

      for (let seed = 1; seed <= MUESTRAS_POR_NIVEL; seed++) {
        const patron = generarEjercicio(seed, regla);
        const esperado = tiemposDelCompas(patron.compas);
        for (let ci = 0; ci < patron.compases.length; ci++) {
          const suma = patron.compases[ci].reduce((s, d) => s + tiemposDeDuracion(d), 0);
          if (Math.abs(suma - esperado) > 0.001) {
            errores.push(`seed=${seed} compás ${ci + 1}: suma=${suma}, esperado=${esperado}`);
          }
        }
      }

      expect(errores).toHaveLength(0);
    });

    it(`${MUESTRAS_POR_NIVEL} ejercicios: densidad no supera el máximo`, () => {
      const max = regla.densidadMaxPorCompas;
      const excesos: string[] = [];

      for (let seed = 1; seed <= MUESTRAS_POR_NIVEL; seed++) {
        const patron = generarEjercicio(seed, regla);
        for (let ci = 0; ci < patron.compases.length; ci++) {
          const n = patron.compases[ci].length;
          if (n > max) {
            excesos.push(`seed=${seed} compás ${ci + 1}: ${n} notas (máx ${max})`);
          }
        }
      }

      expect(excesos).toHaveLength(0);
    });

    it(`${MUESTRAS_POR_NIVEL} ejercicios: longitud correcta (${regla.longitudCompases} compases)`, () => {
      for (let seed = 1; seed <= MUESTRAS_POR_NIVEL; seed++) {
        const patron = generarEjercicio(seed, regla);
        expect(patron.compases).toHaveLength(regla.longitudCompases);
      }
    });

    it('determinismo: mismo seed → mismo ejercicio', () => {
      for (const seed of [1, 7, 42, 999, MUESTRAS_POR_NIVEL]) {
        const a = generarEjercicio(seed, regla);
        const b = generarEjercicio(seed, regla);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    });

    it('variedad: seeds distintos producen ejercicios distintos', () => {
      const patrones = new Set<string>();
      for (let seed = 1; seed <= MUESTRAS_POR_NIVEL; seed++) {
        patrones.add(JSON.stringify(generarEjercicio(seed, regla)));
      }
      if (regla.figurasPermitidas.length === 1) {
        // Solo una figura: la única fuente de variedad es el compás.
        // Con 50 seeds deben aparecer todos los compases permitidos.
        expect(patrones.size).toBe(regla.compasesPermitidos.length);
      } else {
        // Para el resto se espera variedad razonable (≥ 30% únicos).
        // Nivel 2 tiene solo 25 patrones posibles; con 50 seeds
        // estadísticamente obtenemos ~17-22 únicos → 30% es seguro.
        expect(patrones.size).toBeGreaterThan(MUESTRAS_POR_NIVEL * 0.3);
      }
    });
  });
}

// ── Tests independientes del nivel ───────────────────────────────────────────

describe('nuevaSemilla', () => {
  it('retorna un entero positivo', () => {
    for (let i = 0; i < 20; i++) {
      const s = nuevaSemilla();
      expect(s).toBeGreaterThan(0);
      expect(Number.isInteger(s)).toBe(true);
    }
  });

  it('genera valores distintos en llamadas consecutivas', () => {
    const seeds = new Set(Array.from({ length: 20 }, () => nuevaSemilla()));
    expect(seeds.size).toBeGreaterThan(15); // al menos 75% únicos
  });
});
