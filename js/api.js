/**
 * js/api.js — Fetch de ratings Elo + cache localStorage (TTL 24h)
 *
 * Estratégia:
 *   1. Verifica cache localStorage (chave "eloCache", TTL 24h).
 *   2. Se cache válido → retorna direto.
 *   3. Se não → tenta buscar de eloratings.net via CORS proxy.
 *   4. Se fetch falhar → usa ratings hardcoded de data/groups.js (fallback silencioso).
 *
 * Por que CORS proxy?
 *   eloratings.net não serve cabeçalhos CORS, então chamadas diretas de
 *   GitHub Pages falham com "blocked by CORS policy". Usamos allorigins.win
 *   que é gratuito e open-source. Em produção considere seu próprio proxy.
 *
 * Mapa de nomes: eloratings.net usa nomes em inglês; mapeamos para os nomes
 * usados em data/groups.js nos casos em que diferem.
 */

'use strict';

const API = (() => {
  const CACHE_KEY = 'eloCache_v1';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

  // URL da tabela Elo de seleções nacionais (eloratings.net)
  // O endpoint /World retorna JSON com todos os países ranqueados.
  const ELO_URL = 'https://eloratings.net/World.json';
  const PROXY   = 'https://api.allorigins.win/raw?url=';

  /**
   * Mapa de nomes: eloratings.net → nome em data/groups.js
   * Apenas os casos que diferem.
   */
  const NAME_MAP = {
    'United States':       'USA',
    'Ivory Coast':         'Ivory Coast',
    "Côte d'Ivoire":       'Ivory Coast',
    'South Korea':         'South Korea',
    'Korea Republic':      'South Korea',
    'Republic of Korea':   'South Korea',
    'DR Congo':            'DR Congo',
    'Congo DR':            'DR Congo',
    'Democratic Republic of the Congo': 'DR Congo',
    'New Zealand':         'New Zealand',
    'Saudi Arabia':        'Saudi Arabia',
    'Costa Rica':          'Costa Rica',
    'Trinidad and Tobago': 'Trinidad & Tobago',
    'Trinidad & Tobago':   'Trinidad & Tobago',
    'Czech Republic':      'Czechia',
    'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
    'Bosnia & Herzegovina': 'Bosnia & Herzegovina',
    'Cape Verde':          'Cape Verde',
    'Cabo Verde':          'Cape Verde',
    'Curaçao':             'Curaçao',
    'Curacao':             'Curaçao',
    'Iran':                'Iran',
    'IR Iran':             'Iran',
    'Islamic Republic of Iran': 'Iran',
  };

  /** Normaliza o nome do país para o padrão de data/groups.js. */
  function normalizeName(rawName) {
    return NAME_MAP[rawName] || rawName;
  }

  /** Lê o cache do localStorage. Retorna null se ausente ou expirado. */
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { timestamp, ratings } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL) return null;
      return ratings; // { name: eloValue, ... }
    } catch {
      return null;
    }
  }

  /** Persiste ratings no localStorage com timestamp atual. */
  function writeCache(ratings) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), ratings }));
    } catch {
      /* quota excedida — ignora silenciosamente */
    }
  }

  /**
   * Parseia a resposta JSON de eloratings.net.
   * O formato esperado é um array de objetos com campos variados.
   * Retorna { name: eloValue }.
   */
  function parseEloResponse(json) {
    const ratings = {};

    // eloratings.net retorna { teams: [ { name, rating, ... }, ... ] }
    // ou um array direto dependendo da versão da API — tratamos ambos.
    const list = Array.isArray(json) ? json : (json.teams || json.rankings || []);

    for (const entry of list) {
      const name = normalizeName(entry.name || entry.team || entry.country || '');
      const elo  = parseFloat(entry.rating || entry.elo || entry.points || 0);
      if (name && elo > 0) ratings[name] = Math.round(elo);
    }

    return ratings;
  }

  /**
   * Busca ratings Elo de eloratings.net via proxy CORS.
   * Resolve com { name: eloValue } ou rejeita em caso de erro.
   */
  async function fetchFromApi() {
    const url = `${PROXY}${encodeURIComponent(ELO_URL)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return parseEloResponse(json);
  }

  /**
   * Ponto de entrada principal.
   *
   * @returns {Promise<{ source: 'api'|'cache'|'fallback', ratings: Object }>}
   *
   * Sempre resolve (nunca rejeita):
   *   – 'api'      → dados frescos do eloratings.net
   *   – 'cache'    → dados do localStorage (< 24h)
   *   – 'fallback' → sem dados externos, usa Elo de data/groups.js
   */
  async function loadRatings() {
    // 1. Cache válido?
    const cached = readCache();
    if (cached) {
      applyRatings(cached);
      return { source: 'cache', ratings: cached };
    }

    // 2. Tenta API
    try {
      const ratings = await fetchFromApi();
      if (Object.keys(ratings).length > 10) {
        writeCache(ratings);
        applyRatings(ratings);
        return { source: 'api', ratings };
      }
      throw new Error('Resposta da API com poucos registros');
    } catch (err) {
      console.warn('[API] Usando ratings de fallback:', err.message);
      // 3. Fallback: ratings já estão em data/groups.js — não precisamos fazer nada
      return { source: 'fallback', ratings: {} };
    }
  }

  /** Aplica ratings ao objeto GROUPS global via função de data/groups.js. */
  function applyRatings(ratings) {
    if (typeof window.applyEloRatings === 'function') {
      window.applyEloRatings(ratings);
    }
  }

  /** Força remoção do cache (útil para botão "atualizar dados"). */
  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
  }

  return { loadRatings, clearCache };
})();

window.API = API;
