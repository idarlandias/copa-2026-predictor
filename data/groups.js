/**
 * Copa do Mundo FIFA 2026 — Grupos Oficiais
 * Sorteio realizado em 5 de dezembro de 2024, Miami, EUA
 *
 * Formato: 48 seleções em 12 grupos (A–L)
 * Classificam: top 2 de cada grupo + 8 melhores terceiros = 32 equipes
 *
 * ELO ratings: valores aproximados (mai–jun/2025) usados como fallback.
 * api.js tenta sobrescrever com dados em tempo real antes da simulação.
 *
 * Fonte ELO de referência: https://eloratings.net
 */

const GROUPS = {
  A: [
    { name: 'USA',      code: 'US', elo: 1742, flag: '🇺🇸', conf: 'CONCACAF', host: true },
    { name: 'Panama',   code: 'PA', elo: 1437, flag: '🇵🇦', conf: 'CONCACAF' },
    { name: 'Albania',  code: 'AL', elo: 1411, flag: '🇦🇱', conf: 'UEFA' },
    { name: 'Ukraine',  code: 'UA', elo: 1631, flag: '🇺🇦', conf: 'UEFA' },
  ],
  B: [
    { name: 'Mexico',   code: 'MX', elo: 1718, flag: '🇲🇽', conf: 'CONCACAF', host: true },
    { name: 'Jamaica',  code: 'JM', elo: 1428, flag: '🇯🇲', conf: 'CONCACAF' },
    { name: 'Honduras', code: 'HN', elo: 1451, flag: '🇭🇳', conf: 'CONCACAF' },
    { name: 'Kuwait',   code: 'KW', elo: 1391, flag: '🇰🇼', conf: 'AFC' },
  ],
  C: [
    { name: 'Canada',   code: 'CA', elo: 1604, flag: '🇨🇦', conf: 'CONCACAF', host: true },
    { name: 'Chile',    code: 'CL', elo: 1618, flag: '🇨🇱', conf: 'CONMEBOL' },
    { name: 'Uruguay',  code: 'UY', elo: 1761, flag: '🇺🇾', conf: 'CONMEBOL' },
    { name: 'Cameroon', code: 'CM', elo: 1562, flag: '🇨🇲', conf: 'CAF' },
  ],
  D: [
    { name: 'Brazil',     code: 'BR', elo: 1882, flag: '🇧🇷', conf: 'CONMEBOL' },
    { name: 'Paraguay',   code: 'PY', elo: 1554, flag: '🇵🇾', conf: 'CONMEBOL' },
    { name: 'Costa Rica', code: 'CR', elo: 1443, flag: '🇨🇷', conf: 'CONCACAF' },
    { name: 'Nigeria',    code: 'NG', elo: 1519, flag: '🇳🇬', conf: 'CAF' },
  ],
  E: [
    { name: 'Argentina',    code: 'AR', elo: 1972, flag: '🇦🇷', conf: 'CONMEBOL' },
    { name: 'Peru',         code: 'PE', elo: 1612, flag: '🇵🇪', conf: 'CONMEBOL' },
    { name: 'Poland',       code: 'PL', elo: 1588, flag: '🇵🇱', conf: 'UEFA' },
    { name: 'Saudi Arabia', code: 'SA', elo: 1507, flag: '🇸🇦', conf: 'AFC' },
  ],
  F: [
    { name: 'Spain',       code: 'ES', elo: 1935, flag: '🇪🇸', conf: 'UEFA' },
    { name: 'Morocco',     code: 'MA', elo: 1752, flag: '🇲🇦', conf: 'CAF' },
    { name: 'Japan',       code: 'JP', elo: 1731, flag: '🇯🇵', conf: 'AFC' },
    { name: 'New Zealand', code: 'NZ', elo: 1463, flag: '🇳🇿', conf: 'OFC' },
  ],
  G: [
    { name: 'France',      code: 'FR', elo: 1948, flag: '🇫🇷', conf: 'UEFA' },
    { name: 'Ivory Coast', code: 'CI', elo: 1682, flag: '🇨🇮', conf: 'CAF' },
    { name: 'Israel',      code: 'IL', elo: 1493, flag: '🇮🇱', conf: 'UEFA' },
    { name: 'Guatemala',   code: 'GT', elo: 1403, flag: '🇬🇹', conf: 'CONCACAF' },
  ],
  H: [
    { name: 'England',           code: 'GB-ENG', elo: 1912, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf: 'UEFA' },
    { name: 'Senegal',           code: 'SN', elo: 1706, flag: '🇸🇳', conf: 'CAF' },
    { name: 'Serbia',            code: 'RS', elo: 1695, flag: '🇷🇸', conf: 'UEFA' },
    { name: 'Trinidad & Tobago', code: 'TT', elo: 1419, flag: '🇹🇹', conf: 'CONCACAF' },
  ],
  I: [
    { name: 'Portugal',   code: 'PT', elo: 1874, flag: '🇵🇹', conf: 'UEFA' },
    { name: 'Turkey',     code: 'TR', elo: 1658, flag: '🇹🇷', conf: 'UEFA' },
    { name: 'Egypt',      code: 'EG', elo: 1579, flag: '🇪🇬', conf: 'CAF' },
    { name: 'Uzbekistan', code: 'UZ', elo: 1494, flag: '🇺🇿', conf: 'AFC' },
  ],
  J: [
    { name: 'Netherlands', code: 'NL', elo: 1847, flag: '🇳🇱', conf: 'UEFA' },
    { name: 'Austria',     code: 'AT', elo: 1641, flag: '🇦🇹', conf: 'UEFA' },
    { name: 'DR Congo',    code: 'CD', elo: 1528, flag: '🇨🇩', conf: 'CAF' },
    { name: 'Venezuela',   code: 'VE', elo: 1541, flag: '🇻🇪', conf: 'CONMEBOL' },
  ],
  K: [
    { name: 'Colombia', code: 'CO', elo: 1795, flag: '🇨🇴', conf: 'CONMEBOL' },
    { name: 'Germany',  code: 'DE', elo: 1835, flag: '🇩🇪', conf: 'UEFA' },
    { name: 'Ecuador',  code: 'EC', elo: 1664, flag: '🇪🇨', conf: 'CONMEBOL' },
    { name: 'Bolivia',  code: 'BO', elo: 1512, flag: '🇧🇴', conf: 'CONMEBOL' },
  ],
  L: [
    { name: 'Belgium',     code: 'BE', elo: 1798, flag: '🇧🇪', conf: 'UEFA' },
    { name: 'Croatia',     code: 'HR', elo: 1772, flag: '🇭🇷', conf: 'UEFA' },
    { name: 'South Korea', code: 'KR', elo: 1678, flag: '🇰🇷', conf: 'AFC' },
    { name: 'South Africa',code: 'ZA', elo: 1547, flag: '🇿🇦', conf: 'CAF' },
  ],
};

/**
 * Retorna array flat com todas as 48 seleções.
 * Cada objeto recebe { group, groupIndex } para rastreamento.
 */
function getAllTeams() {
  const teams = [];
  for (const [group, members] of Object.entries(GROUPS)) {
    members.forEach((team, i) => {
      teams.push({ ...team, group, groupIndex: i });
    });
  }
  return teams;
}

/**
 * Atualiza ratings ELO em GROUPS a partir de um mapa { name: eloValue }.
 * Chamado por api.js após fetch bem-sucedido.
 */
function applyEloRatings(ratingsMap) {
  for (const members of Object.values(GROUPS)) {
    for (const team of members) {
      if (ratingsMap[team.name] !== undefined) {
        team.elo = ratingsMap[team.name];
      }
    }
  }
}

// Expõe globalmente para uso em index.html (sem módulos ES para compatibilidade com GitHub Pages simples)
window.GROUPS = GROUPS;
window.getAllTeams = getAllTeams;
window.applyEloRatings = applyEloRatings;
