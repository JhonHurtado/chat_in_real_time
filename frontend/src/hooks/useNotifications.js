import { useEffect, useState } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detectar plataforma móvil
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
  }, []);

  useEffect(() => {
    // Solicitar permisos de notificación si no están otorgados
    if (permission === 'default') {
      Notification.requestPermission().then(result => {
        setPermission(result);
      });
    }
  }, [permission]);

  const playNotificationSound = () => {
    try {
      // Para móviles, usar vibración y sonido del sistema
      if (isIOS || isAndroid) {
        // Vibración para móviles
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        
        // Intentar reproducir sonido usando HTML5 Audio para móviles
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFApGn+D1qHosJS');
        audio.volume = 0.3;
        audio.play().catch(() => {
          console.warn('No se pudo reproducir sonido en móvil');
        });
      } else {
        // Sonido para desktop usando Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (error) {
      console.warn('No se pudo reproducir el sonido de notificación:', error);
    }
  };

  const showInAppNotification = (title, body) => {
    // Crear notificación visual dentro de la app para móviles
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-purple-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="font-bold">${title}</div>
      <div class="text-sm mt-1">${body}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.transition = 'transform 0.3s ease-out';
    }, 100);
    
    // Auto eliminar después de 4 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  };

  const showNotification = (title, options = {}) => {
    if (permission === 'granted') {
      // Reproducir sonido de notificación
      if (!options.silent) {
        playNotificationSound();
      }

      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: isIOS || isAndroid,
        ...options
      });

      // Auto cerrar después de 5 segundos (solo en desktop)
      if (!isIOS && !isAndroid) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } else if (isIOS || isAndroid) {
      // Para móviles sin permisos, mostrar notificación visual en la app
      playNotificationSound();
      showInAppNotification(title, options.body);
    }
  };

  const requestPermission = async () => {
    if (permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return permission;
  };

  return {
    permission,
    showNotification,
    requestPermission,
    isSupported: 'Notification' in window,
    playNotificationSound,
    isIOS,
    isAndroid
  };
};

export default useNotifications;