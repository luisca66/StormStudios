const es = {
  title: 'Afinador cromático', listening: 'Escuchando', detecting: 'Detectando', stopped: 'Micrófono apagado', checking: 'Verificando señal',
  noNote: 'No se detecta nota', inTune: 'Afinado', low: 'Bajo', high: 'Alto', signal: 'Señal', confidence: 'Confianza',
  sharps: 'Sostenidos', flats: 'Bemoles', start: 'Activar micrófono', stop: 'Apagar micrófono', retry: 'Volver a intentar', waiting: 'Solicitando permiso…',
  permissionTitle: 'El sonido se queda contigo',
  permissionBody: 'El afinador necesita acceso al micrófono para escuchar tu instrumento y detectar la nota. Todo el audio se procesa en tu dispositivo. No se graba, no se guarda ni se envía.',
  denied: 'No se permitió el micrófono. Habilita el permiso en los ajustes de este sitio del navegador y vuelve a intentar.',
  noDevice: 'No se encontró un micrófono. Conecta uno y vuelve a intentar.',
  busy: 'No se puede abrir el micrófono. Comprueba que esté conectado y disponible.',
  unsupported: 'Este navegador no admite la captura de audio necesaria. Abre el afinador en un navegador actualizado.',
  insecure: 'Para usar el micrófono, abre esta página mediante HTTPS o localhost.',
  ended: 'Se interrumpió el micrófono. Vuelve a activarlo para continuar.',
  capture: 'Se interrumpió la captura de audio. Vuelve a activar el micrófono.',
  hint: 'Toca una sola nota y deja que suene.', range: 'C2–C7', meter: 'Desviación de afinación en cents',
  paused: 'La escucha se pausó al salir de la app. Activa el micrófono para continuar.',
};
const en: typeof es = {
  title: 'Chromatic tuner', listening: 'Listening', detecting: 'Detecting', stopped: 'Microphone off', checking: 'Checking signal',
  noNote: 'No note detected', inTune: 'In tune', low: 'Flat', high: 'Sharp', signal: 'Signal', confidence: 'Confidence',
  sharps: 'Sharps', flats: 'Flats', start: 'Enable microphone', stop: 'Turn off microphone', retry: 'Try again', waiting: 'Requesting permission…',
  permissionTitle: 'The sound stays with you',
  permissionBody: 'The tuner needs microphone access to listen to your instrument and detect its note. All audio is processed on your device. It is never recorded, stored or sent anywhere.',
  denied: 'Microphone access was denied. Enable access in your browser’s site settings and try again.',
  noDevice: 'No microphone was found. Connect one and try again.',
  busy: 'The microphone could not be opened. Check that it is connected and available.',
  unsupported: 'This browser does not support the required audio capture. Open the tuner in an up-to-date browser.',
  insecure: 'To use the microphone, open this page over HTTPS or localhost.',
  ended: 'The microphone was disconnected. Enable it again to continue.',
  capture: 'Audio capture was interrupted. Enable the microphone again.',
  hint: 'Play one note and let it ring.', range: 'C2–C7', meter: 'Tuning deviation in cents',
  paused: 'Listening was paused when you left the app. Enable the microphone to continue.',
};
export const language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es';
export const t = language === 'en' ? en : es;
