# Chat en Tiempo Real 💬

Aplicación de chat en tiempo real que funciona en red local usando Socket.IO, React, Node.js, Express y SQLite.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-black.svg)](https://socket.io)

## 🚀 Características

- **Chat en tiempo real** con Socket.IO
- **Sistema de amigos**: Envía y acepta solicitudes de amistad
- **Chats privados** entre dos usuarios
- **Salas generales** públicas
- **Grupos personalizados** que los usuarios pueden crear
- **Base de datos SQLite** con encriptación AES-256
- **Interfaz moderna** con Tailwind CSS
- **Solo red local** - No requiere internet

## 📚 Documentación

- 📖 **[Instrucciones Detalladas](INSTRUCTIONS.md)** - Guía completa de configuración y uso
- ✨ **[Lista de Funcionalidades](FEATURES.md)** - Todas las características del proyecto
- 🤝 **[Guía de Contribución](CONTRIBUTING.md)** - Cómo contribuir al proyecto
- ❓ **[FAQ](FAQ.md)** - Preguntas frecuentes
- 📝 **[Changelog](CHANGELOG.md)** - Historial de cambios

## 📋 Requisitos Previos

- Node.js (versión 14 o superior)
- npm o yarn

## ⚡ Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/JhonHurtado/chat_in_real_time.git
cd chat_in_real_time
```

### 2. Configurar Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env y cambia ENCRYPTION_KEY
npm start
```

### 3. Configurar Frontend

En otra terminal:

```bash
cd frontend
npm install
npm start
```

La aplicación estará en `http://localhost:3000` 🎉

## 🌐 Uso en Red Local

1. **Encuentra tu IP local:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Configura el frontend:**
   - Edita `frontend/src/socket.js`
   - Cambia `SOCKET_URL:http://TU_IP_LOCAL:3001`

3. **Accede desde otros dispositivos:**
   - `http://TU_IP_LOCAL:3000`

## 📱 Funcionalidades Principales

### Sistema de Usuarios
- ✅ Registro e inicio de sesión seguro
- ✅ Perfiles de usuario

### Sistema de Amigos
- ✅ Buscar usuarios
- ✅ Enviar/aceptar/rechazar solicitudes
- ✅ Lista de amigos con estado en línea

### Chats
- 🌐 **Salas Generales** - Acceso público
- 👥 **Chats Privados** - Solo entre amigos
- 👪 **Grupos** - Crea y gestiona grupos

### Mensajería
- ⚡ Tiempo real con Socket.IO
- 🔒 Encriptación de mensajes
- ✍️ Indicador de escritura
- 📜 Historial de mensajes

## 🏗️ Tecnologías

### Backend
- Node.js + Express
- Socket.IO para comunicación en tiempo real
- SQLite con better-sqlite3
- Bcrypt para hash de contraseñas
- AES-256-CBC para encriptación

### Frontend
- React 18
- Tailwind CSS (CDN)
- Socket.IO Client

## 🔒 Seguridad

- 🔐 Contraseñas hasheadas con bcrypt (10 rondas)
- 🔏 Mensajes encriptados con AES-256-CBC
- ✅ Validación de permisos en salas
- 🚫 Prevención de solicitudes duplicadas

**⚠️ Importante:** Este proyecto está diseñado para red local. Para producción necesitas HTTPS, autenticación mejorada y más medidas de seguridad.

## 📊 Estructura del Proyecto

```
chat_in_real_time/
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── database.js        # Configuración SQLite y encriptación
│   ├── socket.js          # Lógica de Socket.IO
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML con Tailwind CDN
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   ├── socket.js      # Cliente Socket.IO
│   │   └── components/    # Componentes React
│   └── package.json
├── README.md
├── INSTRUCTIONS.md        # Instrucciones detalladas
├── FEATURES.md           # Lista completa de funcionalidades
├── CONTRIBUTING.md       # Guía de contribución
├── FAQ.md               # Preguntas frecuentes
└── LICENSE              # Licencia MIT
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Lee nuestra [Guía de Contribución](CONTRIBUTING.md) para más detalles.

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m '✨ Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🐛 Reportar Problemas

¿Encontraste un bug? [Crea un Issue](https://github.com/JhonHurtado/chat_in_real_time/issues)

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👤 Autor

**JhonHurtado**

- GitHub: [@JhonHurtado](https://github.com/JhonHurtado) [@nina-moscoso](https://github.com/nina-moscoso)

## 🙏 Agradecimientos

- [Socket.IO](https://socket.io) por la comunicación en tiempo real
- [React](https://react.dev) por la interfaz de usuario
- [Tailwind CSS](https://tailwindcss.com) por el diseño
- [SQLite](https://www.sqlite.org) por la base de datos local
- [Express](https://expressjs.com) por el framework backend

---

⭐ Si te gusta este proyecto, considera darle una estrella en GitHub!
