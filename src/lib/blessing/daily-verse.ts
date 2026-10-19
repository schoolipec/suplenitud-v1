/**
 * Reglas puras del mensaje de bendicion del dia. No dependen de Prisma ni del
 * entorno, para poder verificarse de forma determinista.
 */

/**
 * Umbral de prioridad para mensajes administrativos de emergencia o anuncio.
 * Solo los mensajes con prioridad ESTRICTAMENTE mayor a este valor prevalecen
 * sobre la rotacion diaria. Los mensajes curados del seed usan 50 (igual al
 * umbral), por lo que nunca desplazan la rotacion.
 */
export const blessingPriorityOverrideThreshold = 50;

const millisecondsPerDay = 86_400_000;

/**
 * Dia UTC transcurrido desde 1970-01-01. Usar epoch UTC evita el desfase por
 * zona horaria local y por horario de verano (DST).
 */
export function utcEpochDay(now: Date): number {
  return Math.floor(now.getTime() / millisecondsPerDay);
}

/** Indice determinista del versiculo del dia para una lista de `count` elementos. */
export function selectDailyIndex(now: Date, count: number): number {
  if (count <= 0) return -1;
  return ((utcEpochDay(now) % count) + count) % count;
}

export type BlessingFallback = {title: string; body: string; reference: string};

/** Versiculos de respaldo cuando no hay base de datos, traduccion o consulta disponible. */
export const fallbackVerses: Record<string, BlessingFallback> = {
  es: {
    title: "Una palabra para ti",
    body: "El Señor está cerca de todos los que lo invocan de verdad.",
    reference: "Salmo 145:18"
  },
  en: {
    title: "A word for you",
    body: "The Lord is close to all who call on Him in truth.",
    reference: "Psalm 145:18"
  },
  pt: {
    title: "Uma palavra para você",
    body: "O Senhor está perto de todos os que o invocam em verdade.",
    reference: "Salmo 145:18"
  },
  ko: {
    title: "당신을 위한 말씀",
    body: "여호와께서는 진실하게 부르는 모든 자에게 가까이 계십니다.",
    reference: "시편 145:18"
  },
  de: {
    title: "Ein Wort für dich",
    body: "Der Herr ist allen nahe, die ihn in Wahrheit anrufen.",
    reference: "Psalm 145,18"
  }
};
