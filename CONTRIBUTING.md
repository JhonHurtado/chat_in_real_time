# Guía de Contribución

¡Gracias por tu interés en contribuir al proyecto Chat en Tiempo Real! 🎉

## 👨‍💻 Cómo Contribuir

### 1. Fork y Clone

1. Haz fork del repositorio
2. Clona tu fork:
   ```bash
   git clone https://github.com/TU_USUARIO/chat_in_real_time.git
   cd chat_in_real_time
   ```

### 2. Crear una Rama

Crea una rama para tu feature o fix:

```bash
git checkout -b feature/mi-nueva-funcionalidad
# o
git checkout -b fix/correccion-de-bug
```

### 3. Hacer Cambios

- Escribe código limpio y bien documentado
- Sigue las convenciones de estilo del proyecto
- Agrega comentarios cuando sea necesario
- Prueba tus cambios localmente

### 4. Commit

Usa mensajes de commit descriptivos:

```bash
git add .
git commit -m "✨ Add: Nueva funcionalidad de notificaciones"
```

#### Convención de Commits

- `✨ Add:` Nueva funcionalidad
- `🐛 Fix:` Corrección de bug
- `📝 Docs:` Cambios en documentación
- `🎨 Style:` Cambios de formato/estilo
- `♻️ Refactor:` Refactorización de código
- `⚡ Perf:` Mejoras de rendimiento
- `✅ Test:` Agregar o modificar tests
- `🔧 Chore:` Cambios en build, configuración, etc.

### 5. Push y Pull Request

```bash
git push origin feature/mi-nueva-funcionalidad
```

Luego crea un Pull Request en GitHub con:

- **Título descriptivo**
- **Descripción detallada** de los cambios
- **Screenshots** si hay cambios visuales
- **Cómo probar** los cambios

## 📋 Guía de Estilo

### JavaScript/React

- Usa ES6+ syntax
- Componentes funcionales con hooks
- Nombres descriptivos para variables y funciones
- Indentación de 2 espacios
- Comillas simples para strings
- Semicolons al final de sentencias

### Tailwind CSS

- Usa clases de utilidad de Tailwind
- Agrupa clases relacionadas
- Usa responsive design
- Mantiene consistencia con el tema oscuro

### Backend

- Manejo apropiado de errores con try-catch
- Logging de errores importantes
- Validación de inputs
- Comentarios en lógica compleja

## ✅ Testing

Antes de hacer un PR, verifica:

- [ ] El backend inicia sin errores
- [ ] El frontend inicia sin errores
- [ ] No hay errores en la consola del navegador
- [ ] Las funcionalidades existentes siguen funcionando
- [ ] Tu nueva funcionalidad funciona correctamente
- [ ] Probado en modo de desarrollo
- [ ] Probado en red local (si aplica)

## 🐛 Reportar Bugs

### Antes de Reportar

- Busca si el bug ya fue reportado
- Verifica que estés usando la última versión
- Revisa la documentación

### Al Reportar

Incluye:

1. **Descripción clara** del problema
2. **Pasos para reproducir** el bug
3. **Comportamiento esperado** vs **comportamiento actual**
4. **Screenshots** o videos si es posible
5. **Entorno:**
   - Sistema operativo
   - Versión de Node.js
   - Navegador
   - Configuración especial

## 💡 Sugerir Funcionalidades

¡Nos encantan las nuevas ideas! Al sugerir:

1. **Describe la funcionalidad** claramente
2. **Explica el caso de uso**
3. **Proporciona ejemplos** si es posible
4. **Considera el alcance** del proyecto

## 💬 Preguntas

Si tienes preguntas:

1. Revisa la documentación (README, INSTRUCTIONS, FEATURES)
2. Busca en Issues existentes
3. Crea un nuevo Issue con la etiqueta "question"

## 🏆 Reconocimientos

Todos los contribuidores serán reconocidos en el proyecto.

¡Gracias por contribuir! 🚀
