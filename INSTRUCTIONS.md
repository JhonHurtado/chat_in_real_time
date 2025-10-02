# Instrucciones de Configuración y Uso

## 📦 Configuración Inicial

### 1. Backend

```bash
cd backend
npm install
```

Crea el archivo `.env` en la carpeta `backend`:

```bash
cp .env.example .env
```

Edita el archivo `.env` y cambia la clave de encriptación:

```env
PORT=3001
ENCRYPTION_KEY=tu_clave_muy_segura_de_al_menos_32_caracteres_minimo
```

### 2. Frontend

```bash
cd ../frontend
npm install
```

Crea el archivo `.env` en la carpeta `frontend`:

```bash
cp .env.example .env
```

Para desarrollo local, déjalo así:

```env
REACT_APP_SOCKET_URL=http://localhost:3001
```

Para usar en red local, cambia `localhost` por la IP de tu computadora:

```env
REACT_APP_SOCKET_URL=http://192.168.1.100:3001
```

## 🚀 Iniciar la Aplicación

### Terminal 1 - Backend

```bash
cd backend
npm start
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3001
🌐 Accesible en red local en http://<TU_IP_LOCAL>:3001
```

### Terminal 2 - Frontend

```bash
cd frontend
npm start
```

La aplicación se abrirá automáticamente en `http://localhost:3000`

## 🌐 Configuración para Red Local

### Encontrar tu IP Local

**Windows:**
```bash
ipconfig
```
Busca "Dirección IPv4" en tu adaptador de red activo

**Mac:**
```bash
ifconfig | grep "inet "
```

**Linux:**
```bash
ip addr show
# o
hostname -I
```

### Configurar el Frontend para Red Local

1. Edita `frontend/.env`:
```env
REACT_APP_SOCKET_URL=http://TU_IP_LOCAL:3001
```

2. Reinicia el servidor frontend

3. Otros dispositivos en la red pueden acceder a:
   - Frontend: `http://TU_IP_LOCAL:3000`
   - Backend: `http://TU_IP_LOCAL:3001`

### Abrir Puertos en el Firewall (si es necesario)

**Windows:**
1. Panel de Control > Sistema y Seguridad > Firewall de Windows Defender
2. Configuración avanzada > Reglas de entrada
3. Nueva regla > Puerto > TCP > 3000,3001
4. Permitir la conexión

**Mac:**
1. Preferencias del Sistema > Seguridad y Privacidad > Firewall
2. Opciones del Firewall
3. Agregar Node.js a las aplicaciones permitidas

**Linux (UFW):**
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

## 📱 Cómo Usar la Aplicación

### 1. Crear una Cuenta

1. Haz clic en "Regístrate aquí"
2. Completa el formulario:
   - **Nombre de Usuario**: único, sin espacios (ej: `juan_perez`)
   - **Nombre para Mostrar**: tu nombre completo (ej: `Juan Pérez`)
   - **Contraseña**: mínimo 6 caracteres
3. Haz clic en "Crear Cuenta"

### 2. Buscar y Agregar Amigos

1. Ve a la pestaña **"Amigos"**
2. Usa la barra de búsqueda para encontrar usuarios
3. Haz clic en **"Agregar"** para enviar una solicitud
4. El otro usuario debe aceptar tu solicitud

### 3. Aceptar Solicitudes de Amistad

1. Haz clic en el botón **"👥 Solicitudes"**
2. Verás todas las solicitudes pendientes
3. Haz clic en **"✓ Aceptar"** o **"✗ Rechazar"**

### 4. Chatear con Amigos (Chat Privado)

1. Ve a la pestaña **"Amigos"**
2. Haz clic en el amigo con quien quieres chatear
3. Se creará automáticamente un chat privado
4. El chat privado aparecerá en la pestaña **"Chats"**

### 5. Usar Salas Generales

1. Ve a la pestaña **"Chats"**
2. Haz clic en **"🌐 General"**
3. Todos los usuarios pueden participar en esta sala

### 6. Crear Grupos

1. Haz clic en **"➕ Crear Grupo"**
2. Escribe un nombre para el grupo
3. Selecciona los amigos que quieres agregar (debes tener amigos primero)
4. Haz clic en **"Crear Grupo"**
5. Todos los miembros pueden chatear en el grupo

## 💡 Consejos y Trucos

### Indicadores de Estado
- **Punto verde**: El amigo está en línea
- **Sin punto**: El amigo está desconectado
- **Notificación roja**: Tienes solicitudes de amistad pendientes

### Funciones de Chat
- Los mensajes se envían en **tiempo real**
- Puedes ver cuando alguien está escribiendo (3 puntos animados)
- Los mensajes propios aparecen en **morado** a la derecha
- Los mensajes de otros aparecen en **gris** a la izquierda
- Se muestra la hora de cada mensaje

### Privacidad
- Solo puedes chatear con **amigos aceptados**
- No puedes enviar múltiples solicitudes al mismo usuario
- Los mensajes están **encriptados** en la base de datos
- Las contraseñas están **hasheadas**

## ⚠️ Solución de Problemas

### El backend no se conecta

**Error:** `EADDRINUSE` (puerto en uso)

**Solución:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### El frontend no se conecta al backend

**Verificar:**
1. ¿El backend está corriendo?
2. ¿La URL en `.env` es correcta?
3. ¿El firewall está bloqueando la conexión?

**Probar conexión:**
```bash
# Desde otra terminal
curl http://localhost:3001/api/users
# Debería devolver un array JSON
```

### No puedo conectarme desde otro dispositivo

**Verificar:**
1. Ambos dispositivos están en la **misma red WiFi**
2. La IP en el `.env` del frontend es correcta
3. Los puertos 3000 y 3001 están abiertos en el firewall
4. Intenta hacer ping al servidor:
   ```bash
   ping TU_IP_LOCAL
   ```

### Los mensajes no se encriptan

**Verificar:**
- El archivo `.env` del backend tiene una `ENCRYPTION_KEY` configurada
- La clave tiene al menos 32 caracteres
- El backend se reinició después de cambiar el `.env`

### La aplicación se ve rota (sin estilos)

**Verificar:**
- Tailwind CSS se carga desde el CDN (revisa la consola del navegador)
- Hay conexión a internet para cargar Tailwind (si no, los estilos no se cargarán)

## 📊 Estructura de la Base de Datos

La base de datos SQLite se crea automáticamente en `backend/chat.db` con las siguientes tablas:

- **users**: Usuarios registrados
- **friendships**: Relaciones de amistad
- **rooms**: Salas de chat (generales, privadas, grupos)
- **room_members**: Miembros de cada sala
- **messages**: Mensajes (encriptados)

## 🔒 Seguridad

- Las contraseñas se hashean con **bcrypt** (10 rondas)
- Los mensajes se encriptan con **AES-256-CBC**
- La clave de encriptación debe ser secreta y única
- No se envían contraseñas en texto plano
- Los tokens de sesión se manejan por Socket.IO

## 📦 Producción

Para un despliegue en producción:

1. Cambia todas las URLs a tu dominio/IP pública
2. Usa HTTPS con certificados SSL
3. Configura variables de entorno seguras
4. Usa una base de datos más robusta (PostgreSQL, MySQL)
5. Implementa autenticación con JWT
6. Agrega rate limiting
7. Implementa logging adecuado
8. Configura CORS adecuadamente

## 📝 Licencia

MIT License - Libre para usar y modificar
