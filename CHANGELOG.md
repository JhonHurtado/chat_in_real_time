# Changelog

Todas las modificaciones importantes al proyecto serán documentadas en este archivo.

## [1.0.0] - 2025-10-02

### Agregado

#### Backend
- ✨ Servidor Express con Socket.IO
- 💾 Base de datos SQLite con encriptación AES-256
- 🔒 Sistema de autenticación con bcrypt
- 👥 Sistema completo de amigos y solicitudes
- 💬 Salas generales, chats privados y grupos
- 📡 Comunicación en tiempo real con Socket.IO
- ⌨️ Indicador de escritura en tiempo real
- 🟢 Sistema de presencia (en línea/desconectado)

#### Frontend
- ✨ Aplicación React con Tailwind CSS
- 🎨 Diseño moderno con tema oscuro
- 🔐 Componentes de Login y Registro
- 💬 Interfaz de chat con mensajes en tiempo real
- 👫 Lista de amigos con búsqueda
- 📩 Sistema de solicitudes de amistad
- 👪 Creación de grupos
- 🟢 Indicadores de estado en línea
- 🔔 Notificaciones en tiempo real

#### Documentación
- 📝 README completo con instrucciones
- 🛠️ INSTRUCTIONS.md con guía detallada
- ✅ FEATURES.md con lista completa de funcionalidades
- 📄 LICENSE (MIT)

### Características de Seguridad
- 🔒 Encriptación de mensajes en base de datos
- 🔐 Hash de contraseñas con bcrypt
- ✅ Validación de autorización en salas
- 🚫 Prevención de solicitudes duplicadas

### Optimizaciones
- ⚡ Índices en base de datos para mejor rendimiento
- 📦 Carga de últimos 100 mensajes por sala
- 🔄 Reconnección automática de Socket.IO
- 📱 Diseño responsive

### Configuración
- 🌐 Soporte para red local
- ⚙️ Variables de entorno configurables
- 📦 Archivos .env.example incluidos
- 📁 Estructura de proyecto organizada

---

## Tipos de Cambios

- `✨ Agregado` para nuevas funcionalidades
- `⚙️ Cambiado` para cambios en funcionalidades existentes
- `🚨 Deprecado` para funcionalidades que serán removidas
- `🚫 Removido` para funcionalidades removidas
- `🐛 Corregido` para correcciones de bugs
- `🔒 Seguridad` para vulnerabilidades corregidas
