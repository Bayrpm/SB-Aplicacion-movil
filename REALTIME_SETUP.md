# 🔔 Configuración de Supabase Realtime

## ✅ Implementación completada

Se ha implementado **Supabase Realtime** en `inspectorHome.tsx` para detectar nuevas derivaciones automáticamente.

## 📋 Configuración necesaria en Supabase

Para que funcione el tiempo real, debes habilitar Realtime en la tabla `asignaciones_inspector`:

### 1. Accede a tu dashboard de Supabase

Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 2. Habilita Realtime para la tabla

```sql
-- Opción A: Desde SQL Editor (recomendado)
alter publication supabase_realtime add table asignaciones_inspector;
```

**O desde la UI:**

1. Ve a **Database** → **Replication**
2. Busca la tabla `asignaciones_inspector`
3. Activa el switch de **Realtime**
4. Marca el evento: `INSERT` ✅

### 3. Verifica que RLS permita SELECT

La suscripción Realtime necesita que el inspector pueda hacer SELECT en `asignaciones_inspector`:

```sql
-- Política RLS para SELECT (probablemente ya la tienes)
CREATE POLICY "Inspectores pueden ver sus asignaciones"
ON asignaciones_inspector
FOR SELECT
TO authenticated
USING (
  inspector_id IN (
    SELECT id FROM inspectores WHERE usuario_id = auth.uid()
  )
);
```

## 🎯 Cómo funciona

### Flujo automático:

1. **Portal web asigna nueva derivación** → INSERT en `asignaciones_inspector`
2. **Supabase Realtime dispara evento** → Llega a la app móvil
3. **App detecta el cambio** → Recarga derivaciones automáticamente
4. **Se detecta nueva PENDIENTE** → Muestra modal de notificación
5. **Inspector puede ver inmediatamente** → Sin necesidad de refrescar

### Logs que verás:

```
[HomeScreen] Configurando suscripción Realtime...
[HomeScreen] Suscribiéndose a cambios para inspector: 8
[HomeScreen] Estado suscripción Realtime: SUBSCRIBED
[HomeScreen] 🔔 Nueva asignación detectada: { new: {...}, old: null }
[HomeScreen] Recargando derivaciones por Realtime...
[HomeScreen] Derivaciones PENDIENTES: 3
[HomeScreen] ✅ Nueva derivación detectada - Mostrando modal
```

## 🔧 Comportamiento

### ✅ Modal se muestra automáticamente cuando:

- Estás en la app (cualquier tab: home, notificaciones, perfil)
- Se asigna una nueva derivación a tu ID de inspector
- La derivación está en estado PENDIENTE
- Es más reciente que la última vista

### ✅ Funciona en background:

- No necesitas estar en `inspectorHome` específicamente
- La suscripción está activa mientras la app esté abierta
- Se reconecta automáticamente si pierdes conexión

### 🔄 Se desconecta cuando:

- Cierras la app completamente
- Cambias de usuario (logout)
- El componente se desmonta

## 🐛 Troubleshooting

### El modal no aparece automáticamente:

1. **Verifica que Realtime esté habilitado:**

   ```sql
   SELECT schemaname, tablename
   FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
   AND tablename = 'asignaciones_inspector';
   ```

   Debe retornar 1 fila.

2. **Revisa los logs en la consola:**

   - ¿Dice "SUBSCRIBED"?
   - ¿Aparece el evento cuando asignas?

3. **Verifica RLS:**

   - El inspector debe poder hacer SELECT en sus asignaciones
   - Prueba manualmente: `SELECT * FROM asignaciones_inspector WHERE inspector_id = X`

4. **Network issues:**
   - Realtime usa WebSockets (puerto 443)
   - Verifica que no haya firewall bloqueando

## 📊 Testing

Para probar que funciona:

1. Abre la app móvil como inspector
2. Desde el portal web, asigna una nueva derivación a ese inspector
3. **Inmediatamente** deberías ver:
   - Logs en consola: "🔔 Nueva asignación detectada"
   - El modal de nueva derivación aparecer automáticamente
   - La lista actualizarse en tiempo real

## ⚡ Performance

- **Consumo de datos**: Mínimo (solo eventos, no polling)
- **Latencia**: < 1 segundo desde INSERT hasta notificación
- **Batería**: Eficiente (WebSocket persistente, no HTTP polling)

## 🎉 Ventajas

✅ **Instantáneo** - No hay delay de 30seg/1min como con polling
✅ **Eficiente** - Solo se notifica cuando HAY cambios
✅ **Universal** - Funciona en cualquier tab de la app
✅ **Escalable** - Supabase maneja la infraestructura
✅ **Confiable** - Reconexión automática si hay problemas de red
