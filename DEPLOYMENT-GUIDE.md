# 🚀 Guía de Despliegue — Storm Studios Learning
**Para:** Claude Haiku (o quien ayude a Luis)
**Objetivo:** Reemplazar el WordPress de DreamHost con el nuevo sitio Next.js en Vercel, gratis.
**Dominio:** stormstudios.com.mx (registrado en Akky)
**Correo actual:** info@stormstudios.com.mx (en DreamHost — se va a migrar a Zoho)
**Repo GitHub:** https://github.com/luisca66/StormStudios

---

## FASE 1 — Subir el código a GitHub

El proyecto está en la carpeta local del usuario. Abrir una terminal DENTRO de esa carpeta y ejecutar estos comandos en orden:

```bash
git init
git remote add origin https://github.com/luisca66/StormStudios.git
git branch -M main
git add .
git commit -m "Storm Studios Learning — nuevo sitio Next.js"
git push -f origin main
```

> ⚠️ El `-f` en el último comando es intencional — sobreescribe el repo viejo que solo tenía un index.html.

**Verificar:** Ir a https://github.com/luisca66/StormStudios y confirmar que ya aparecen carpetas como `app/`, `components/`, `content/`, etc.

---

## FASE 2 — Crear cuenta en Vercel y conectar el repo

1. Ir a **https://vercel.com** y hacer clic en **"Sign Up"**
2. Elegir **"Continue with GitHub"** — esto conecta Vercel con la cuenta de GitHub de Luis (luisca66)
3. Autorizar los permisos que pide
4. En el dashboard de Vercel, hacer clic en **"Add New Project"**
5. Buscar y seleccionar el repo **"StormStudios"**
6. En la pantalla de configuración del proyecto:
   - **Framework Preset:** Next.js (Vercel lo detecta automático)
   - **Root Directory:** dejar en blanco (el proyecto está en la raíz)
   - **Build Command:** `npm run build` (ya está configurado)
   - **Output Directory:** `.next` (automático)
   - **Environment Variables:** NO hay ninguna que agregar
7. Hacer clic en **"Deploy"**
8. Esperar 2-3 minutos mientras construye el sitio
9. **Verificar:** Vercel dará una URL temporal tipo `stormstudios-xyz.vercel.app` — abrir esa URL y confirmar que el sitio se ve bien

---

## FASE 3 — Agregar el dominio en Vercel

1. En el proyecto de Vercel, ir a **Settings → Domains**
2. Escribir `stormstudios.com.mx` y hacer clic en **"Add"**
3. También agregar `www.stormstudios.com.mx`
4. Vercel mostrará los registros DNS que hay que configurar. Serán algo así:

| Tipo  | Nombre | Valor                     |
|-------|--------|---------------------------|
| A     | @      | 76.76.21.21               |
| CNAME | www    | cname.vercel-dns.com      |

> ⚠️ Los valores exactos los muestra Vercel en pantalla — usar LOS QUE VERCEL INDIQUE, no los de esta tabla.

---

## FASE 4 — Cambiar el DNS en Akky

1. Ir a **https://www.akky.mx** e iniciar sesión
2. Ir a la sección de administración del dominio `stormstudios.com.mx`
3. Buscar la sección **"DNS"** o **"Zona DNS"** o **"Administrar DNS"**
4. Modificar o crear los registros que indicó Vercel en la Fase 3:
   - Registro **A** apuntando a la IP de Vercel
   - Registro **CNAME** para www
5. Guardar los cambios
6. **Esperar 10-30 minutos** para que el DNS se propague
7. **Verificar:** Abrir https://stormstudios.com.mx — debe cargar el sitio nuevo

> 💡 Para verificar propagación sin esperar se puede usar: https://dnschecker.org

---

## FASE 5 — Migrar el correo a Zoho Mail (gratis)

El correo info@stormstudios.com.mx actualmente está en DreamHost. Lo migramos a Zoho Mail que es gratuito.

### 5.1 Crear cuenta en Zoho Mail
1. Ir a **https://mail.zoho.com** → **"Sign Up Free"**
2. Elegir **"Forever Free Plan"** (1 usuario, 5GB)
3. Elegir **"Add your existing domain"**
4. Escribir `stormstudios.com.mx`

### 5.2 Verificar el dominio en Zoho
Zoho pedirá agregar un registro TXT en el DNS para verificar que el dominio es tuyo:
1. Copiar el registro TXT que da Zoho (algo como `zoho-verification=...`)
2. Ir a Akky → DNS del dominio
3. Agregar registro **TXT** con el valor que dio Zoho
4. Volver a Zoho y hacer clic en **"Verify"**

### 5.3 Configurar MX records en Akky
Zoho dará registros MX para recibir correo. Agregarlos en Akky → DNS:

| Tipo | Nombre | Valor                  | Prioridad |
|------|--------|------------------------|-----------|
| MX   | @      | mx.zoho.com            | 10        |
| MX   | @      | mx2.zoho.com           | 20        |
| MX   | @      | mx3.zoho.com           | 50        |

> ⚠️ Usar los valores exactos que muestra Zoho, pueden variar ligeramente.

### 5.4 Crear el buzón
1. En Zoho Mail, crear el usuario `info`
2. La contraseña que elija Luis para revisar ese correo

### 5.5 Eliminar MX de DreamHost
Una vez funcionando Zoho, en Akky eliminar los registros MX viejos que apuntaban a DreamHost.

---

## FASE 6 — Cancelar DreamHost

Una vez verificado que:
- ✅ El sitio carga en stormstudios.com.mx desde Vercel
- ✅ El correo info@stormstudios.com.mx llega a Zoho

Entonces:
1. Entrar a panel.dreamhost.com
2. Ir a **Billing & Account → Manage Account**
3. Cancelar el plan de hosting
4. El dominio NO está en DreamHost (está en Akky) así que no hay riesgo de perderlo

---

## FASE 7 — Actualizaciones futuras del sitio

Cada vez que Luis quiera actualizar el sitio (nuevo post, cambio de texto, etc.):

```bash
git add .
git commit -m "descripción del cambio"
git push origin main
```

Vercel detecta el push automáticamente y publica el sitio actualizado en ~2 minutos. No hay que hacer nada más.

---

## Resumen de costos después de la migración

| Servicio        | Costo          |
|-----------------|----------------|
| Vercel (sitio)  | $0 / mes       |
| Zoho Mail       | $0 / mes       |
| Dominio (Akky)  | ~$350 MXN / año|
| DreamHost       | $0 (cancelado) |

---

## Notas técnicas del proyecto

- **Framework:** Next.js 16 con App Router
- **Internacionalización:** next-intl (rutas `/es/` y `/en/`)
- **Estilos:** Tailwind CSS + CSS custom (`storm-studios.css`)
- **Contenido:** MDX en `content/` (blog y lecciones del curso)
- **Herramientas web:** Secuenciador en `public/tools/` (archivos HTML estáticos)
- **Apps web:** Juegos y apps en `public/apps/` (archivos HTML estáticos)
- **Sin variables de entorno:** El proyecto no requiere ningún `.env`
- **Sin base de datos:** Todo el contenido está en archivos MDX

---

*Guía generada por Claude Sonnet para Storm Studios Learning — Febrero 2026*
