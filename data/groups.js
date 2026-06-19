/**
 * Copa do Mundo FIFA 2026 — Grupos Oficiais
 * Sorteio oficial e chaveamento definitivo (Fonte: fifa.com)
 *
 * Formato: 48 seleções em 12 grupos (A–L)
 * Classificam: top 2 de cada grupo + 8 melhores terceiros = 32 equipes
 *
 * ELO ratings: valores atualizados em junho de 2026 usados como fallback.
 * api.js tenta sobrescrever com dados em tempo real antes da simulação.
 *
 * Fonte ELO de referência: https://eloratings.net
 */

const GROUPS = {
  A: [
    { name: 'Mexico',       code: 'MX', elo: 1718, flag: '🇲🇽', conf: 'CONCACAF', host: true },
    { name: 'South Korea',  code: 'KR', elo: 1678, flag: '🇰🇷', conf: 'AFC' },
    { name: 'Czechia',      code: 'CZ', elo: 1712, flag: '🇨🇿', conf: 'UEFA' },
    { name: 'South Africa', code: 'ZA', elo: 1547, flag: '🇿🇦', conf: 'CAF' },
  ],
  B: [
    { name: 'Canada',       code: 'CA', elo: 1604, flag: '🇨🇦', conf: 'CONCACAF', host: true },
    { name: 'Switzerland',  code: 'CH', elo: 1891, flag: '🇨🇭', conf: 'UEFA' },
    { name: 'Bosnia & Herzegovina', code: 'BA', elo: 1595, flag: '🇧🇦', conf: 'UEFA' },
    { name: 'Qatar',        code: 'QA', elo: 1427, flag: '🇶🇦', conf: 'AFC' },
  ],
  C: [
    { name: 'Scotland',     code: 'GB-SCT', elo: 1782, flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', conf: 'UEFA' },
    { name: 'Morocco',      code: 'MA', elo: 1752, flag: '🇲🇦', conf: 'CAF' },
    { name: 'Brazil',       code: 'BR', elo: 1882, flag: '🇧🇷', conf: 'CONMEBOL' },
    { name: 'Haiti',        code: 'HT', elo: 1548, flag: '🇭🇹', conf: 'CONCACAF' },
  ],
  D: [
    { name: 'USA',          code: 'US', elo: 1742, flag: '🇺🇸', conf: 'CONCACAF', host: true },
    { name: 'Australia',    code: 'AU', elo: 1777, flag: '🇦🇺', conf: 'AFC' },
    { name: 'Turkey',       code: 'TR', elo: 1658, flag: '🇹🇷', conf: 'UEFA' },
    { name: 'Paraguay',     code: 'PY', elo: 1554, flag: '🇵🇾', conf: 'CONMEBOL' },
  ],
  E: [
    { name: 'Germany',      code: 'DE', elo: 1835, flag: '🇩🇪', conf: 'UEFA' },
    { name: 'Ivory Coast',  code: 'CI', elo: 1682, flag: '🇨🇮', conf: 'CAF' },
    { name: 'Ecuador',      code: 'EC', elo: 1664, flag: '🇪🇨', conf: 'CONMEBOL' },
    { name: 'Curaçao',      code: 'CW', elo: 1434, flag: '🇨🇼', conf: 'CONCACAF' },
  ],
  F: [
    { name: 'Sweden',       code: 'SE', elo: 1712, flag: '🇸🇪', conf: 'UEFA' },
    { name: 'Japan',        code: 'JP', elo: 1731, flag: '🇯🇵', conf: 'AFC' },
    { name: 'Netherlands',  code: 'NL', elo: 1847, flag: '🇳🇱', conf: 'UEFA' },
    { name: 'Tunisia',      code: 'TN', elo: 1628, flag: '🇹🇳', conf: 'CAF' },
  ],
  G: [
    { name: 'New Zealand',  code: 'NZ', elo: 1463, flag: '🇳🇿', conf: 'OFC' },
    { name: 'Iran',         code: 'IR', elo: 1772, flag: '🇮🇷', conf: 'AFC' },
    { name: 'Belgium',      code: 'BE', elo: 1798, flag: '🇧🇪', conf: 'UEFA' },
    { name: 'Egypt',        code: 'EG', elo: 1579, flag: '🇪🇬', conf: 'CAF' },
  ],
  H: [
    { name: 'Uruguay',      code: 'UY', elo: 1761, flag: '🇺🇾', conf: 'CONMEBOL' },
    { name: 'Saudi Arabia', code: 'SA', elo: 1507, flag: '🇸🇦', conf: 'AFC' },
    { name: 'Spain',        code: 'ES', elo: 1935, flag: '🇪🇸', conf: 'UEFA' },
    { name: 'Cape Verde',   code: 'CV', elo: 1578, flag: '🇨🇻', conf: 'CAF' },
  ],
  I: [
    { name: 'Norway',       code: 'NO', elo: 1914, flag: '🇳🇴', conf: 'UEFA' },
    { name: 'France',       code: 'FR', elo: 1948, flag: '🇫🇷', conf: 'UEFA' },
    { name: 'Senegal',      code: 'SN', elo: 1706, flag: '🇸🇳', conf: 'CAF' },
    { name: 'Iraq',         code: 'IQ', elo: 1607, flag: '🇮🇶', conf: 'AFC' },
  ],
  J: [
    { name: 'Argentina',    code: 'AR', elo: 1972, flag: '🇦🇷', conf: 'CONMEBOL' },
    { name: 'Austria',      code: 'AT', elo: 1641, flag: '🇦🇹', conf: 'UEFA' },
    { name: 'Jordan',       code: 'JO', elo: 1680, flag: '🇯🇴', conf: 'AFC' },
    { name: 'Algeria',      code: 'DZ', elo: 1772, flag: '🇩🇿', conf: 'CAF' },
  ],
  K: [
    { name: 'Colombia',     code: 'CO', elo: 1795, flag: '🇨🇴', conf: 'CONMEBOL' },
    { name: 'DR Congo',     code: 'CD', elo: 1528, flag: '🇨🇩', conf: 'CAF' },
    { name: 'Portugal',     code: 'PT', elo: 1874, flag: '🇵🇹', conf: 'UEFA' },
    { name: 'Uzbekistan',   code: 'UZ', elo: 1494, flag: '🇺🇿', conf: 'AFC' },
  ],
  L: [
    { name: 'England',      code: 'GB-ENG', elo: 1912, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf: 'UEFA' },
    { name: 'Ghana',        code: 'GH', elo: 1510, flag: '🇬🇭', conf: 'CAF' },
    { name: 'Panama',       code: 'PA', elo: 1437, flag: '🇵🇦', conf: 'CONCACAF' },
    { name: 'Croatia',      code: 'HR', elo: 1772, flag: '🇭🇷', conf: 'UEFA' },
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
