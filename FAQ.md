# Preguntas Frecuentes (FAQ)

## 📁 General

### ¿Qué es Chat en Tiempo Real?

Es una aplicación de mensajería instantánea que funciona en red local, permitiendo comunicación en tiempo real entre usuarios conectados a la misma red WiFi.

### ¿Necesito Internet para usarlo?

No. La aplicación funciona completamente en red local. Solo necesitas Internet durante la instalación inicial para descargar dependencias y Tailwind CSS desde CDN.

### ¿Es gratis?

Sí, es completamente gratuito y de código abierto bajo licencia MIT.

## 🛠️ Instalación

### ¿Qué necesito instalar?

- Node.js (versión 14 o superior)
- npm (viene con Node.js)

### Error: "npm: command not found"

Node.js/npm no está instalado. Descárgalo de [nodejs.org](https://nodejs.org)

## 🌐 Red Local

### ¿Cómo encuentro mi IP local?

**Windows:**
```bash
ipconfig
```

**Mac/Linux:**
```bash
ifconfig
```

### No puedo conectarme desde otro dispositivo

**Verifica:**
1. ¿Ambos dispositivos están en la misma red WiFi?
2. ¿El backend está corriendo?
3. ¿La IP en `.env` es correcta?
4. ¿El firewall está bloqueando los puertos?

## 👥 Usuarios y Amigos

### No puedo encontrar a un usuario

Asegúrate de:
- Escribir correctamente el nombre
- El usuario está registrado
- Ambos están conectados al mismo servidor

## 💬 Mensajes

### Los mensajes no se envían

**Verifica:**
1. ¿Socket.IO está conectado?
2. ¿Eres miembro de la sala?
3. ¿Son amigos (para chats privados)?

### ¿Los mensajes se guardan?

Sí, todos los mensajes se guardan encriptados en la base de datos SQLite.

## 🔒 Seguridad

### ¿Qué tan seguros son mis mensajes?

- Encriptados con AES-256-CBC en la base de datos
- Para máxima seguridad, implementa HTTPS/TLS

### ¿Mi contraseña está segura?

Sí, se hashea con bcrypt antes de guardarse. Nunca se almacena en texto plano.

## ⚡ Rendimiento

### ¿Cuántos usuarios soporta?

Optimizado para equipos pequeños (5-50 usuarios). Para más usuarios, considera una base de datos más robusta.

## 🐛 Problemas Comunes

### Error: "EADDRINUSE"

El puerto ya está en uso.

**Solución:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Base de datos corrupta

Elimina `backend/chat.db` y reinicia el backend.

## 📚 Recursos

### Documentación

- [README.md](README.md)
- [INSTRUCTIONS.md](INSTRUCTIONS.md)
- [FEATURES.md](FEATURES.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

---

¿No encuentras tu pregunta? Crea un [Issue](https://github.com/JhonHurtado/chat_in_real_time/issues).
