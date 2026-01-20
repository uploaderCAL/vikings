
export const Haptics = {
  /**
   * Vibração para notificações de novas mensagens.
   * Padrão: 200ms de vibração.
   */
  notification: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  },

  /**
   * Vibração leve para interações (ex: curtidas).
   * Padrão: Dois pulsos rápidos de 50ms.
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  },

  /**
   * Vibração de erro ou alerta.
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }
};
