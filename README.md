# Chat en Tiempo Real 💬

Aplicación de chat en tiempo real que funciona en red local usando Socket.IO, React, Node.js, Express y SQLite.

## 🚀 Características

- **Chat en tiempo real** con Socket.IO
- **Sistema de amigos**: Envía y acepta solicitudes de amistad
- **Chats privados** entre dos usuarios
- **Salas generales** públicas
- **Grupos personalizados** que los usuarios pueden crear
- **Base de datos SQLite** con encriptación
- **Interfaz moderna** con Tailwind CSS
- **Solo red local** - No requiere internet

## 📋 Requisitos Previos

- Node.js (versión 14 o superior)
- npm o yarn

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/JhonHurtado/chat_in_real_time.git
cd chat_in_real_time
```

### 2. Instalar dependencias del Backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del Frontend

```bash
cd ../frontend
npm install
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend` basado en `.env.example`:

```bash
cd ../backend
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```
PORT=3001
ENCRYPTION_KEY=tu_clave_secreta_muy_segura_de_32_caracteres
```

## 🚀 Ejecución

### Iniciar el Backend

```bash
cd backend
npm start
```

El servidor estará corriendo en `http://localhost:3001`

### Iniciar el Frontend

En otra terminal:

```bash
cd frontend
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🌐 Uso en Red Local

Para usar la aplicación en tu red local:

1. Encuentra tu IP local:
   - **Windows**: `ipconfig` en CMD
   - **Mac/Linux**: `ifconfig` o `ip addr show` en terminal

2. Otros dispositivos en la misma red pueden acceder usando:
   - Frontend: `http://TU_IP_LOCAL:3000`
   - Backend: `http://TU_IP_LOCAL:3001`

3. Actualiza `frontend/src/socket.js` con la IP del servidor si es necesario.

## 📱 Funcionalidades

### Sistema de Usuarios
- Registro e inicio de sesión
- Perfil de usuario

### Sistema de Amigos
- Buscar usuarios
- Enviar solicitudes de amistad
- Aceptar o rechazar solicitudes
- Lista de amigos

### Chats
- **Salas Generales**: Chats públicos donde todos pueden participar
- **Chats Privados**: Solo entre amigos (1 a 1)
- **Grupos**: Crea grupos y agrega a tus amigos

### Mensajes
- Envío en tiempo real
- Historial de mensajes
- Indicador de mensajes nuevos
- Mensajes encriptados en la base de datos

## 🏗️ Estructura del Proyecto

```
chat_in_real_time/
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── database.js        # Configuración SQLite
│   ├── socket.js          # Lógica de Socket.IO
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML con Tailwind CDN
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   ├── index.js       # Punto de entrada
│   │   ├── socket.js      # Cliente Socket.IO
│   │   └── components/    # Componentes React
│   └── package.json
└── README.md
```

## 🔒 Seguridad

- Los mensajes se encriptan antes de guardarse en la base de datos
- Las contraseñas se hashean con bcrypt
- Tokens de sesión para autenticación

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👤 Autor

**JhonHurtado**

- GitHub: [@JhonHurtado](https://github.com/JhonHurtado)

## 🙏 Agradecimientos

- Socket.IO por la comunicación en tiempo real
- React por la interfaz de usuario
- Tailwind CSS por el diseño
- SQLite por la base de datos local