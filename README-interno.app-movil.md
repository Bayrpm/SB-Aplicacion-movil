# 🔒 README Interno — App Móvil (Tecnología & Ejecución con Docker Desktop)

> **Propósito**: Documentar el **stack**, la **integración** con el BFF y **cómo ejecutar** la app móvil usando **Docker Desktop** (GUI).  
> **Producción**: la app se distribuye como binarios móviles (EAS Build). Este README cubre **desarrollo local** (Expo).

---

## 🧰 Stack Tecnológico (alto nivel)

| Capa | Tecnología | Notas |
|---|---|---|
| **App** | **React Native + Expo** | UI móvil multiplataforma |
| **Estado/UI** | React / Hooks (Feature-First Lite) | Organización por features |
| **Backend** | **BFF** (en el portal web) | La app **consume** `/api/bff/**` |
| **Auth** | **Supabase Auth (JWT)** | Sesión en el cliente; el BFF verifica roles |
| **Media** | Supabase Storage (URL firmada) | Subidas directas con URL firmada |
| **Notificaciones** | (según definición posterior) | — |
| **Dev** | **Docker Desktop** | Dev server Expo en contenedor |

> La app **no** usa `service-role`. Sólo `EXPO_PUBLIC_*` y JWT de usuario para llamadas al BFF.

---

## 🏗️ Integración (resumen)

- La app obtiene **JWT** con Supabase Auth.  
- Llama al **BFF**: `GET/POST https://<dominio-del-portal>/api/bff/*` con `Authorization: Bearer <jwt>`.  
- Para evidencias: solicita **URL firmada** al BFF y sube **directo** a Storage.  
- **CORS**: habilitado en el BFF para orígenes de Expo en dev (y dominios oficiales en preview/prod).

---

## 🔐 Variables de Entorno (Expo)

Usar prefijo **`EXPO_PUBLIC_`** para exponer valores en el cliente.

```env
# .env (o .env.local) — NO subir valores reales al repo

# Supabase (públicos en cliente)
EXPO_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# BFF (portal web)
EXPO_PUBLIC_API_BASE=https://<tu-dominio>.vercel.app   # o http://localhost:3000 en dev
```

> 📌 **Si no cuentas con los valores de `.env`/`.env.local`**, solicítalos en **Microsoft Teams → canal “Desarrollo”** del proyecto.

**Uso en código (ejemplo):**
```ts
const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
// ...
const res = await fetch(`${API_BASE}/api/bff/denuncias`, {
  headers: { Authorization: `Bearer ${session?.access_token}` }
});
```

---

## 🗂️ Archivos relevantes en el repo

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile.dev` | Dev server de Expo (con `--tunnel`) en contenedor |
| `docker-compose.dev.yml` | Orquesta puertos y bind mount del código |
| `.dockerignore` | Evita copiar `node_modules`, cachés, etc. |
| `README.md` | README público (orientado a ciudadanía e inspectores) |
| `README-interno.md` | **Este documento** |

---

## ▶️ Ejecución con **Docker Desktop** (GUI, sin terminal)

> **Requisitos**: Docker Desktop instalado, repo clonado y archivo **`.env`/`.env.local`** creado (pídelo en Teams si no lo tienes).

1. **Abrir Docker Desktop** → pestaña **Containers**.  
2. **Create → From compose file** → seleccionar `docker-compose.dev.yml`.  
3. Revisar puertos expuestos (típicos de Expo): **19000**, **19001**, **19002**, **8081**.  
4. En **Environment files**, cargar el `.env`.  
5. **Run** → cuando esté **Running**, abrir el panel de **DevTools** de Expo (Docker Desktop muestra el enlace) o usa el QR (modo **tunnel**).  
6. Editar en VS Code → cambios visibles con **Fast Refresh**.  
7. Detener/Iniciar desde Docker Desktop. Para cambios de dependencias: **⋯ → Recreate (with build)**.

---

## 🔁 Dependencias (solo GUI)

- **Agregar una dependencia**: Containers → `mobile` → **Exec** → `npm install paquete@version` → commit/push del `package.json` y `package-lock.json` con tu cliente Git GUI.  
- **Sincronizar el equipo**: Containers → `mobile` → **⋯ → Recreate (with build)`.

Si quedara cacheado, **Delete** con “Also delete volumes” y **Create from compose** nuevamente.

---

## 🌐 CORS (dev)
Asegúrate de que el BFF permita orígenes de Expo en desarrollo:  
`http://localhost:19006`, `exp://` y dominios de preview/prod.

---

## 🧯 Troubleshooting rápido

| Síntoma | Causa probable | Solución (GUI) |
|---|---|
| Expo no abre / QR no conecta | Red/puertos | Usar **tunnel** (por defecto). Verificar puertos **19000/19001/19002/8081**. |
| No hay recarga | Watchers en contenedor | **Recreate (with build)**. Confirmar bind mount del código. |
| 401 en llamadas al BFF | Falta JWT | Confirmar login y header `Authorization: Bearer <token>`. |
| CORS bloqueado | Origen no permitido | Agregar origen de Expo en el helper CORS del BFF. |

---

## 📬 Contacto interno
- **Canal Teams — Desarrollo**: variables `.env`, avisos y soporte.  
- **Soporte / Incidentes**: _[correo interno]_

> Este README se actualizará conforme evolucionen el stack y el flujo de trabajo.
