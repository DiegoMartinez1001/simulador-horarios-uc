# Simulador de Horarios UC

Aplicación web para buscar materias y secciones de Ingeniería UC, crear un horario semanal y detectar cruces de horario.

## Publicación web
1. En GitHub abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. El flujo **Publicar simulador en GitHub Pages** desplegará el sitio al hacer cambios en `main`.

## Actualización de horarios
- El flujo **Actualizar horarios DAE** consulta la publicación oficial cada 15 minutos.
- Para forzar una actualización, abre **Actions → Actualizar horarios DAE → Run workflow**.
- Cuando termine correctamente, vuelve al simulador y pulsa **Recargar datos**.
- El actualizador valida que el número de secciones y bloques sea razonable antes de sustituir los datos. Si falla la lectura, conserva el catálogo anterior.

Fuente oficial: https://dae.ing.uc.edu.ve/horarios/
