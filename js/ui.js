/**
 * js/ui.js — Renderização do Dashboard
 *
 * Seções:
 *   1. Gráfico de barras — probabilidade de ser campeão (top 20)
 *   2. Tabela de fases   — probabilidade de cada seleção em cada fase
 *   3. Cards de grupos   — chance de classificação nos 12 grupos
 *   4. Bracket esperado  — chaveamento baseado em ratings Elo atuais
 */

'use strict';

const UI = (() => {
  // ─── Constantes ────────────────────────────────────────────────────────────
  const PHASES = ['R32', 'R16', 'QF', 'SF', 'Final', 'Champion'];
  const PHASE_LABELS = {
    Group: 'Grupos', R32: 'R32', R16: 'Oitavas', QF: 'Quartas',
    SF: 'Semi', Final: 'Final', Champion: 'Campeão',
  };

  // Gradiente de cor para probabilidades nas células da tabela (verde → amarelo → vermelho invertido)
  const HEAT_COLORS = [
    { threshold: 0.30, color: '#1a9e4a' },
    { threshold: 0.15, color: '#4ab86e' },
    { threshold: 0.08, color: '#8fc93a' },
    { threshold: 0.03, color: '#c8b820' },
    { threshold: 0.01, color: '#c87a20' },
    { threshold: 0,    color: '#2a3050' },
  ];

  let _sortCol = 'Champion';
  let _sortDir = 'desc';
  let _lastProbs = null;

  // ─── Utilitários ───────────────────────────────────────────────────────────

  function pct(val, decimals = 1) {
    return `${(val * 100).toFixed(decimals)}%`;
  }

  function heatColor(val) {
    for (const { threshold, color } of HEAT_COLORS) {
      if (val >= threshold) return color;
    }
    return HEAT_COLORS[HEAT_COLORS.length - 1].color;
  }

  /** Calcula P(A vence) com fórmula Elo clássica. */
  function eloWinProb(eloA, eloB) {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  }

  /** Retorna o time de um grupo a partir do GROUPS global. */
  function teamByName(name) {
    for (const members of Object.values(window.GROUPS)) {
      const t = members.find(m => m.name === name);
      if (t) return t;
    }
    return null;
  }

  /** Retorna a tag img da bandeira a partir do flagcdn para compatibilidade com Windows. */
  function getFlagHtml(team) {
    if (!team) return '🏳️';
    if (team.code) {
      const codeLower = team.code.toLowerCase();
      return `<img src="https://flagcdn.com/w40/${codeLower}.png" alt="${team.name}" class="flag-icon">`;
    }
    return team.flag || '🏳️';
  }

  // ─── Progresso ────────────────────────────────────────────────────────────

  function showProgress({ pct: p, done, total }) {
    const wrap  = document.getElementById('progress-wrap');
    const bar   = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    bar.style.width = `${p}%`;
    label.textContent = `Simulando… ${done.toLocaleString()} / ${total.toLocaleString()} (${p}%)`;
  }

  function hideProgress() {
    const wrap = document.getElementById('progress-wrap');
    if (wrap) wrap.classList.add('hidden');
  }

  function setSimulationMeta({ elapsed, simulations, source }) {
    const el = document.getElementById('sim-meta');
    if (!el) return;
    const secs = (elapsed / 1000).toFixed(2);
    const sourceLabel = source === 'api' ? 'API (ao vivo)' : source === 'cache' ? 'Cache (24h)' : 'Fallback (Elo local)';
    el.innerHTML = `<span>${simulations.toLocaleString()} simulações</span>
                    <span>${secs}s de processamento</span>
                    <span>Dados: ${sourceLabel}</span>`;
    el.classList.remove('hidden');
  }

  // ─── 1. Gráfico de Barras ─────────────────────────────────────────────────

  function renderChampionChart(probs) {
    const container = document.getElementById('chart-container');
    if (!container) return;

    // Ordena por probabilidade de título — todas as 48 seleções
    const ranked = Object.entries(probs)
      .map(([name, phases]) => ({ name, prob: phases.Champion || 0 }))
      .sort((a, b) => b.prob - a.prob);

    const maxProb = ranked[0]?.prob || 1;

    container.style.maxHeight = '700px';
    container.style.overflowY = 'auto';
    container.innerHTML = ranked.map(({ name, prob }) => {
      const team  = teamByName(name);
      const flagHtml = getFlagHtml(team);
      const width = ((prob / maxProb) * 100).toFixed(1);
      const pctStr = pct(prob, 1);
      return `
        <div class="bar-row">
          <div class="bar-team">
            <span class="bar-flag">${flagHtml}</span>
            <span class="bar-name">${name}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: 0%" data-width="${width}%">
              <span class="bar-value">${pctStr}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    // Anima as barras após inserção no DOM
    requestAnimationFrame(() => {
      container.querySelectorAll('.bar-fill').forEach(el => {
        el.style.width = el.dataset.width;
      });
    });
  }

  // ─── 2. Tabela de Fases ───────────────────────────────────────────────────

  function renderPhaseTable(probs) {
    const table = document.getElementById('phase-table');
    if (!table) return;

    // Cabeçalho
    const headerCells = ['Seleção', ...PHASES.map(p => PHASE_LABELS[p])]
      .map((label, i) => {
        const col = i === 0 ? 'name' : PHASES[i - 1];
        const active = col === _sortCol ? ` sort-${_sortDir}` : '';
        return `<th class="sortable${active}" data-col="${col}">${label}</th>`;
      }).join('');

    // Linhas — ordena conforme coluna ativa
    const rows = Object.entries(probs)
      .map(([name, phases]) => ({ name, ...phases }))
      .sort((a, b) => {
        const valA = _sortCol === 'name' ? a.name : (a[_sortCol] || 0);
        const valB = _sortCol === 'name' ? b.name : (b[_sortCol] || 0);
        if (typeof valA === 'string') return _sortDir === 'asc'
          ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return _sortDir === 'asc' ? valA - valB : valB - valA;
      })
      .map(row => {
        const team = teamByName(row.name);
        const flagHtml = getFlagHtml(team);
        const cells = PHASES.map(phase => {
          const val = row[phase] || 0;
          const bg  = heatColor(val);
          return `<td style="background:${bg}">${pct(val, 1)}</td>`;
        }).join('');
        return `<tr>
          <td class="team-cell"><span>${flagHtml}</span> ${row.name}</td>
          ${cells}
        </tr>`;
      }).join('');

    table.innerHTML = `
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>`;

    // Evento de ordenação (delegado na tabela)
    table.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (_sortCol === col) {
          _sortDir = _sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          _sortCol = col;
          _sortDir = col === 'name' ? 'asc' : 'desc';
        }
        renderPhaseTable(_lastProbs);
      });
    });
  }

  // ─── 3. Cards de Grupos ───────────────────────────────────────────────────

  function renderGroupCards(probs) {
    const container = document.getElementById('groups-container');
    if (!container) return;

    const cards = Object.entries(window.GROUPS).map(([groupName, teams]) => {
      const rows = teams
        .map(team => ({
          ...team,
          r32Prob: probs[team.name]?.R32 || 0,
          champProb: probs[team.name]?.Champion || 0,
        }))
        .sort((a, b) => b.r32Prob - a.r32Prob)
        .map((team, i) => {
          const qualified = i < 2 ? 'qualified' : i === 2 ? 'maybe' : 'eliminated';
          const flagHtml = getFlagHtml(team);
          return `
            <div class="group-team ${qualified}">
              <span class="group-flag">${flagHtml}</span>
              <span class="group-name">${team.name}</span>
              <span class="group-prob">${pct(team.r32Prob, 0)}</span>
              <span class="group-elo">Elo ${team.elo}</span>
            </div>`;
        }).join('');

      return `
        <div class="group-card">
          <div class="group-header">Grupo ${groupName}</div>
          ${rows}
          <div class="group-legend">
            <span class="dot qualified"></span> Classif.
            <span class="dot maybe"></span> Possível
          </div>
        </div>`;
    }).join('');

    container.innerHTML = cards;
  }

  // ─── 4. Bracket Esperado (baseado em Elo) ─────────────────────────────────

  /**
   * Calcula os standings esperados de cada grupo via pontos esperados (Elo).
   * P(empate) ≈ 0.24 para partidas entre seleções.
   */
  function computeExpectedStandings() {
    const DRAW_PROB = 0.24;
    const standings = {};

    for (const [groupName, teams] of Object.entries(window.GROUPS)) {
      const s = teams.map(t => ({ ...t, expPts: 0 }));

      for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j < s.length; j++) {
          const pw = eloWinProb(s[i].elo, s[j].elo);
          const pl = 1 - pw;
          // Ajusta draw para ser proporcional ao quão equilibrado é o duelo
          const draw = DRAW_PROB * (1 - Math.abs(pw - 0.5) * 1.5);
          const wAdj = pw - draw / 2;
          const lAdj = pl - draw / 2;
          s[i].expPts += Math.max(0, 3 * wAdj + draw);
          s[j].expPts += Math.max(0, 3 * lAdj + draw);
        }
      }

      s.sort((a, b) => b.expPts - a.expPts || b.elo - a.elo);
      standings[groupName] = s;
    }

    return standings;
  }

  function renderBracket(probs) {
    const container = document.getElementById('bracket-container');
    if (!container) return;

    const standings = computeExpectedStandings();
    const groupKeys  = Object.keys(window.GROUPS).sort();

    // Monta lista de 32 classificados esperados (seed 1-12 winners, 13-24 RU, 25-32 best 3rd)
    const winners   = groupKeys.map(g => ({ ...standings[g][0], position: 1, group: g }));
    const runnersUp = groupKeys.map(g => ({ ...standings[g][1], position: 2, group: g }));
    const thirds    = groupKeys
      .map(g => ({ ...standings[g][2], position: 3, group: g }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 8);

    const seeds = [...winners, ...runnersUp, ...thirds];

    // Mesma ordem de bracket usada no worker
    const ORDER = [
       0, 31, 15, 16,  7, 24,  8, 23,
       3, 28, 12, 19,  4, 27, 11, 20,
       1, 30, 14, 17,  6, 25,  9, 22,
       2, 29, 13, 18,  5, 26, 10, 21,
    ];

    const bracket = ORDER.map(i => seeds[i] || seeds[seeds.length - 1]);

    // Simula o bracket deterministicamente (mais forte sempre vence — só para exibição)
    function expectedWinner(a, b) {
      return a.elo >= b.elo ? a : b;
    }

    // Constrói as 5 rodadas
    function buildRounds(teams) {
      const rounds = [teams];
      let current = teams;
      while (current.length > 1) {
        const next = [];
        for (let i = 0; i < current.length; i += 2) {
          next.push(expectedWinner(current[i], current[i + 1]));
        }
        rounds.push(next);
        current = next;
      }
      return rounds; // [32, 16, 8, 4, 2, 1]
    }

    const rounds = buildRounds(bracket);
    const roundNames = ['R32', 'R16', 'Quartas', 'Semis', 'Final', 'Campeão'];

    // Renderiza só a partir das quartas de final (QF) para manter o bracket legível
    const QF_START = 2; // rounds[2] = quartas (8 times)
    const visibleRounds = rounds.slice(QF_START);
    const visibleNames  = roundNames.slice(QF_START);

    const html = visibleRounds.map((roundTeams, ri) => {
      const roundLabel = visibleNames[ri];
      const items = roundTeams.map((team, ti) => {
        const champProb = probs ? pct(probs[team.name]?.Champion || 0, 1) : '';
        const sfProb    = probs ? pct(probs[team.name]?.SF || 0, 0)        : '';
        const flagHtml = getFlagHtml(team);
        return `
          <div class="bracket-match ${ri === visibleRounds.length - 1 ? 'champion' : ''}">
            <div class="bracket-team" title="Campeão: ${champProb}">
              <span>${flagHtml}</span>
              <span class="bname">${team.name}</span>
              ${ri === visibleRounds.length - 1
                ? `<span class="bprob champion-star">🏆 ${champProb}</span>`
                : `<span class="bprob">${sfProb}</span>`}
            </div>
          </div>`;
      }).join('');

      return `<div class="bracket-round">
        <div class="round-label">${roundLabel}</div>
        <div class="round-matches">${items}</div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <p class="bracket-note">
        Bracket esperado com base em ratings Elo — mostrando Quartas em diante.
        As probabilidades de título são do Monte Carlo.
      </p>
      <div class="bracket-grid">${html}</div>`;
  }

  // ─── Orquestração Principal ───────────────────────────────────────────────

  /**
   * Chamada por index.html quando a simulação termina.
   * @param {Object} probabilities  — { teamName: { phase: probability } }
   * @param {Object} meta           — { elapsed, simulations, source }
   */
  function renderResults(probabilities, meta) {
    _lastProbs = probabilities;
    hideProgress();
    setSimulationMeta(meta);
    renderChampionChart(probabilities);
    renderPhaseTable(probabilities);
    renderGroupCards(probabilities);
    renderBracket(probabilities);

    // Revela seções que estavam ocultas durante o carregamento
    document.querySelectorAll('.section').forEach(el => el.classList.remove('loading'));
  }

  /** Inicializa o bracket com dados Elo antes da simulação terminar. */
  function initBracketPreview() {
    renderBracket(null);
    renderGroupCards(
      Object.fromEntries(
        Object.values(window.GROUPS).flat().map(t => [t.name, { R32: 0, Champion: 0 }])
      )
    );
  }

  return { renderResults, showProgress, hideProgress, initBracketPreview };
})();

window.UI = UI;
