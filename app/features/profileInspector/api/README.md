# APIs del Perfil de Inspector

## 📋 Resumen de refactorización

Se identificó y eliminó código duplicado entre `turnInspector.api.ts` e `inspectorProfile.api.ts`.

## 🎯 Archivo principal: `inspectorProfile.api.ts`

Este es el archivo principal que debe usarse para todas las operaciones relacionadas con el perfil del inspector.

### Funciones disponibles:

#### `getInspectorProfile()`

Obtiene el perfil completo del inspector autenticado, incluyendo:

- Información personal (nombre, apellido, email, teléfono, avatar)
- Datos del turno asignado
- Estado del inspector

**Retorna:**

```typescript
{
  data: InspectorProfile | null;
  error: string | null;
}
```

**Ejemplo de uso:**

```typescript
import { getInspectorProfile } from "@/app/features/profileInspector/api/inspectorProfile.api";

const { data, error } = await getInspectorProfile();

if (error) {
  console.error(error);
  return;
}

console.log(data.perfil.nombre); // Nombre del inspector
console.log(data.turno_tipo.nombre); // "Diurno", "Nocturno", etc.
console.log(data.turno_tipo.hora_inicio); // "08:00:00"
```

#### `getTurnoInspector()`

Función de conveniencia que extrae solo los datos del turno del perfil.

**Retorna:** `InspectorTurnType | null`

**Ejemplo de uso:**

```typescript
import { getTurnoInspector } from "@/app/features/profileInspector/api/inspectorProfile.api";

const turno = await getTurnoInspector();

if (turno) {
  console.log(turno.nombre); // "Diurno"
  console.log(turno.hora_inicio); // "08:00:00"
  console.log(turno.hora_termino); // "16:00:00"
}
```

#### `getTurnoInspectorCompat()` ⚠️ Deprecado

Mantiene compatibilidad con el formato anterior. Usar `getInspectorProfile()` en su lugar.

## 📄 Archivo legacy: `turnInspector.api.ts` ⚠️

Este archivo se mantiene **solo para compatibilidad** con código existente pero está marcado como **deprecado**.

**NO USAR** para nuevas implementaciones.

Las funciones en este archivo son wrappers que llaman a `inspectorProfile.api.ts`.

## 🔄 Interfaces

### `InspectorProfile`

```typescript
interface InspectorProfile {
  id: number;
  usuario_id: string;
  activo: boolean;
  tipo_turno: number | null;
  perfil: InspectorPersonInfo | null;
  turno_tipo: InspectorTurnType | null;
}
```

### `InspectorTurnType`

```typescript
interface InspectorTurnType {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  hora_inicio: string;
  hora_termino: string;
  operador: boolean;
  inspector: boolean;
}
```

### `InspectorPersonInfo`

```typescript
interface InspectorPersonInfo {
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  avatar_url?: string | null;
}
```

## ✅ Ventajas de la refactorización

1. **Eliminación de duplicación**: Una sola consulta a la base de datos
2. **Mejor rendimiento**: Menos queries a Supabase
3. **Código más mantenible**: Una sola fuente de verdad
4. **Interfaces consistentes**: Tipos unificados
5. **Función de normalización reutilizable**: `normalizeRelation<T>()`

## 🚀 Migración recomendada

Si estás usando `turnInspector.api.ts`, migra a `inspectorProfile.api.ts`:

### Antes:

```typescript
import { getTurnoInspector } from "../api/turnInspector.api";

const response = await getTurnoInspector();
const turno = response.turno_data;
```

### Después (Opción 1 - Recomendada):

```typescript
import { getInspectorProfile } from "../api/inspectorProfile.api";

const { data, error } = await getInspectorProfile();
const turno = data?.turno_tipo;
const perfil = data?.perfil;
```

### Después (Opción 2 - Solo turno):

```typescript
import { getTurnoInspector } from "../api/inspectorProfile.api";

const turno = await getTurnoInspector();
```

## ⚠️ Notas importantes

- El archivo `turnInspector.api.ts` será **eliminado en futuras versiones**
- Actualizar todas las importaciones a `inspectorProfile.api.ts`
- La función `getTurnoInspectorById()` no está implementada correctamente y lanzará un error
