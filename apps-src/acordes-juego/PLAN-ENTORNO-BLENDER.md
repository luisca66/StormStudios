# Plan — Entorno de Batisfera en Blender

> Escrito por Claude el 2026-09-16, a pedido de Luis. Sigue el método de `PLAN-3D-BLENDER.md` §6
> (Astra modela, Claude integra, Luis aprueba renders) y el precedente del Océano
> (`../oido-absoluto-multi-juego/PLAN-OCEANO-BLENDER.md`): **una pieza a la vez**.

## Dónde estamos

Las 7 criaturas y la cabina ya son de Blender. El entorno sigue siendo el prototipo de H3, hecho
con primitivas de Three.js en `src/3d/environment.ts`:

- **Mundo:** un pozo vertical de 750 u (5 zonas de 150 u), radio jugable 90 u, pared de roca
  procedural a ~96 u y suelo de la fosa en y = −750. El agua pasa de azul soleado a negro.
- **Decorado por zona:** z1 barco hundido (cajas y conos) + 3 columnas de burbujas · z2 4 arcos
  de roca (toros deformados) · z3 45 corales (conos con punta ámbar) · z4 osamenta de ballena
  (losa, cilindro y toros) + 15 anémonas-farol (esferas) · z5 12 pináculos (conos) + 6
  chimeneas hidrotermales (conos con brasa).
- **Transversal:** 14 balizas de expedición con letrero de profundidad, vetas luminosas en la
  pared y termoclinas entre zonas.

Dirección: **mar profundo realista con bioluminiscencia**, la misma familia que las criaturas.
Distinto del arrecife caricaturesco y soleado del Océano.

## Orden propuesto (Luis puede reordenarlo)

| # | Pieza | Zona | Quién | Por qué en este orden |
|---|---|---|---|---|
| 1 | **Barco hundido sobre repisa de roca** | z1 | Astra | Es lo primero que ve cualquier jugador; hoy es lo que más se nota como primitivas |
| 2 | Arcos de roca | z2 | Astra | Siluetas grandes que orientan en la penumbra |
| 3 | Jardín de corales bioluminiscentes (kit instanciado) | z3 | Astra | Da color a la zona donde ya no llega el sol |
| 4 | Osamenta de ballena + anémonas-farol | z4 | Astra | Hito narrativo de la zona abisal |
| 5 | Chimeneas hidrotermales y pináculos | z5 | Astra | Fondo de la fosa, donde vive el Leviatán |
| 6 | Kit de salientes de roca para la pared | todas | Claude con bpy | Utilería instanciada, sin brief, como el kit de arrecife del Océano |
| 7 | Baliza de expedición | todas | Claude con bpy | Pieza chica y repetida |

Presupuesto de referencia (escritorio): cada hito ≤ 35 000 triángulos; los kits instanciados
≤ 10 000 en total. Las piezas de una zona solo se ven cerca de esa zona, así que no se suman todas
en pantalla.

## Estado

| Pieza | Estado |
|---|---|
| Barco hundido | ✅ publicado (2026-09-16): Astra v1–v3, Claude v4 e integración |
| Arcos de roca | ✅ publicado (2026-09-17): Astra v1–v3, Claude v4 e integración. 2 variantes, 4 arcos en la pared de la zona 2 |
| Jardín de corales | ✅ publicado (2026-09-17): Astra v1–v3, integración de Claude. Kit de 4 piezas, 135 corales en 6 manchones de la zona 3 |
| Osamenta de ballena | ✅ publicada (2026-09-17): Astra v1–v3, integración de Claude. Hito sobre repisa + 25 anémonas-farol rosas |
| Chimeneas hidrotermales | ⏳ brief listo (2026-09-17, `art/blender/chimeneas-hidrotermales/BRIEF.md`): kit de 4 piezas del fondo de la fosa, calor naranja; esperando a Astra |
| Kit de salientes de roca | ✅ publicado (2026-09-17): Claude con bpy. 3 piezas, 110 salientes por toda la pared |
| Baliza de expedición | ✅ publicada (2026-09-17): Claude con bpy. Farol fondeado; el juego conserva halo y letrero |
