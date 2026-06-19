/**
 * js/worker.js — Motor Monte Carlo (Web Worker)
 *
 * Recebe via postMessage: { groups, simulations }
 * Envia  via postMessage:
 *   { type: 'progress', done, total }      — a cada 5.000 simulações
 *   { type: 'result',  probabilities, elapsed, simulations }  — ao final
 *
 * Probabilidade de vitória (Elo): P = 1 / (1 + 10^((eloB - eloA) / 400))
 * Gols simulados via Poisson (algoritmo de Knuth — estável para λ < 15)
 */

'use strict';

// ─── Constantes ─────────────────────────────────────────────────────────────
const AVG_GOALS   = 1.25;   // média de gols por equipe por partida (~1.25 é realista)
const ELO_SCALE   = 400;    // escala clássica do sistema Elo
const GOAL_FACTOR = 0.35;   // sensibilidade dos gols à diferença de Elo
const PROGRESS_EVERY = 5000;

// ─── Utilidades ─────────────────────────────────────────────────────────────

/** Gera número aleatório com distribuição de Poisson (algoritmo de Knuth). */
function poissonRand(lambda) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

/**
 * Simula placar de uma partida com base nos ratings Elo.
 * Retorna { goalsA, goalsB }.
 */
function simulateMatch(eloA, eloB) {
  const diff   = eloA - eloB;
  const lambdaA = Math.max(0.2, AVG_GOALS * (1 + GOAL_FACTOR * diff / ELO_SCALE));
  const lambdaB = Math.max(0.2, AVG_GOALS * (1 - GOAL_FACTOR * diff / ELO_SCALE));
  return { goalsA: poissonRand(lambdaA), goalsB: poissonRand(lambdaB) };
}

/**
 * Mata eliminatória (sem empate): se placar for igual vai a pênaltis.
 * Retorna o objeto-time vencedor.
 */
function knockoutMatch(teamA, teamB) {
  const { goalsA, goalsB } = simulateMatch(teamA.elo, teamB.elo);
  if (goalsA !== goalsB) return goalsA > goalsB ? teamA : teamB;

  // Pênaltis — leve viés para o time mais forte (máximo 55-45)
  const p = 0.5 + 0.05 * (teamA.elo - teamB.elo) / ELO_SCALE;
  return Math.random() < Math.min(0.6, Math.max(0.4, p)) ? teamA : teamB;
}

// ─── Fase de Grupos ──────────────────────────────────────────────────────────

/**
 * Simula o mata-mata de grupos completo (12 grupos × 6 partidas = 72 jogos).
 * Retorna { groupName: [ ...standings ] } com times ordenados.
 */
function simulateGroupStage(groups) {
  const results = {};

  for (const [groupName, teams] of Object.entries(groups)) {
    // Cria cópias com contadores zerados
    const standings = teams.map(t => ({
      ...t, pts: 0, gd: 0, gf: 0, w: 0, d: 0, l: 0,
    }));

    // Round-robin: todos contra todos (C(4,2) = 6 partidas)
    for (let i = 0; i < standings.length; i++) {
      for (let j = i + 1; j < standings.length; j++) {
        const { goalsA, goalsB } = simulateMatch(standings[i].elo, standings[j].elo);

        standings[i].gf += goalsA;
        standings[j].gf += goalsB;
        standings[i].gd += goalsA - goalsB;
        standings[j].gd += goalsB - goalsA;

        if (goalsA > goalsB) {
          standings[i].pts += 3; standings[i].w++;
          standings[j].l++;
        } else if (goalsA < goalsB) {
          standings[j].pts += 3; standings[j].w++;
          standings[i].l++;
        } else {
          standings[i].pts += 1; standings[i].d++;
          standings[j].pts += 1; standings[j].d++;
        }
      }
    }

    // Critérios de desempate: pts → saldo de gols → gols pró → nome (determinístico)
    standings.sort((a, b) =>
      b.pts  - a.pts  ||
      b.gd   - a.gd   ||
      b.gf   - a.gf   ||
      a.name.localeCompare(b.name)
    );

    results[groupName] = standings;
  }

  return results;
}

// ─── Classificação para o R32 ────────────────────────────────────────────────

/**
 * Determina os 32 classificados:
 *   – 1º e 2º de cada um dos 12 grupos (24 times)
 *   – Os 8 melhores terceiros de 12 (por pts → saldo → gols)
 */
function determineQualifiers(groupResults) {
  const qualified  = [];
  const thirdPlace = [];

  for (const [group, standings] of Object.entries(groupResults)) {
    qualified.push({ ...standings[0], position: 1, group });
    qualified.push({ ...standings[1], position: 2, group });
    thirdPlace.push({ ...standings[2], position: 3, group });
  }

  thirdPlace.sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
  );

  thirdPlace.slice(0, 8).forEach(t => qualified.push({ ...t }));
  return qualified; // 32 times
}

// ─── Montagem do Chaveamento ─────────────────────────────────────────────────

/**
 * Organiza os 32 classificados em um chaveamento padrão seedado.
 *
 * Seeds:
 *   1-12  → vencedores dos grupos (A1…L1, ordem alfabética)
 *   13-24 → vice-líderes (A2…L2)
 *   25-32 → melhores 8 terceiros (já ordenados por qualidade)
 *
 * Arranjo do bracket: 1v32, 2v31, 3v30, …, 16v17
 * A ordem no array reflete o lado do chaveamento para que
 * os confrontos na metade esquerda e direita não se cruzem até a Final.
 *
 * Índices de arranjo padrão para 32 seeds (0-indexed):
 */
function buildBracket(qualified) {
  const byGroup = (a, b) => a.group.localeCompare(b.group);

  const winners   = qualified.filter(t => t.position === 1).sort(byGroup); // 12
  const runnersUp = qualified.filter(t => t.position === 2).sort(byGroup); // 12
  const thirds    = qualified.filter(t => t.position === 3);               // 8 (já sorted)

  const seeds = [...winners, ...runnersUp, ...thirds]; // seeds[0]=seed1, seeds[31]=seed32

  // Arranjo clássico de bracket seedado para 32 equipes
  // Garante: seed 1 vs seed 32 numa extremidade, seed 2 vs seed 31 na outra, etc.
  const ORDER = [
     0, 31, 15, 16,  7, 24,  8, 23,
     3, 28, 12, 19,  4, 27, 11, 20,
     1, 30, 14, 17,  6, 25,  9, 22,
     2, 29, 13, 18,  5, 26, 10, 21,
  ];

  return ORDER.map(i => seeds[i] || seeds[seeds.length - 1]); // fallback defensivo
}

// ─── Fases Eliminatórias ─────────────────────────────────────────────────────

/**
 * Executa o chaveamento eliminatório completo e acumula as contagens de fase.
 *
 * Semântica de phaseReached[name][fase]++:
 *   R32     → classificou da fase de grupos
 *   R16     → venceu na R32 (avançou para oitavas)
 *   QF      → venceu nas oitavas (avançou para quartas)
 *   SF      → venceu nas quartas (avançou para semi)
 *   Final   → venceu na semi (chegou à Final)
 *   Champion→ campeão
 *   3rd     → vencedor da disputa de 3º lugar
 */
function runKnockout(bracket, phaseReached) {
  // Todos os 32 classificados chegaram à R32
  for (const team of bracket) phaseReached[team.name].R32++;

  let round = bracket; // 32 times
  const sfLosers = [];

  // R32 → R16
  round = playRound(round, 'R16', phaseReached, null);

  // R16 → QF
  round = playRound(round, 'QF', phaseReached, null);

  // QF → SF
  round = playRound(round, 'SF', phaseReached, null);

  // SF → Final  (coleta perdedores para 3º lugar)
  round = playRound(round, 'Final', phaseReached, sfLosers);

  // Disputa do 3º lugar
  if (sfLosers.length === 2) {
    const third = knockoutMatch(sfLosers[0], sfLosers[1]);
    phaseReached[third.name]['3rd']++;
  }

  // Final
  const champion = knockoutMatch(round[0], round[1]);
  phaseReached[champion.name].Champion++;
}

/** Executa uma rodada de mata-mata e retorna os vencedores. */
function playRound(round, nextPhase, phaseReached, losersCollector) {
  const next = [];
  for (let i = 0; i < round.length; i += 2) {
    const w = knockoutMatch(round[i], round[i + 1]);
    const l = w === round[i] ? round[i + 1] : round[i];
    phaseReached[w.name][nextPhase]++;
    if (losersCollector) losersCollector.push(l);
    next.push(w);
  }
  return next;
}

// ─── Loop Principal ──────────────────────────────────────────────────────────

self.onmessage = function ({ data }) {
  const { groups, simulations } = data;
  const N = simulations || 100_000;

  // Inicializa contadores
  const allNames = Object.values(groups).flat().map(t => t.name);
  const phaseReached = {};
  for (const name of allNames) {
    phaseReached[name] = {
      Group: N, R32: 0, R16: 0, QF: 0, SF: 0, Final: 0, Champion: 0, '3rd': 0,
    };
  }

  const t0 = Date.now();

  for (let sim = 0; sim < N; sim++) {
    if (sim > 0 && sim % PROGRESS_EVERY === 0) {
      self.postMessage({ type: 'progress', done: sim, total: N });
    }

    const groupResults = simulateGroupStage(groups);
    const qualified    = determineQualifiers(groupResults);
    const bracket      = buildBracket(qualified);
    runKnockout(bracket, phaseReached);
  }

  // Converte contagens → probabilidades
  const probabilities = {};
  for (const [name, phases] of Object.entries(phaseReached)) {
    probabilities[name] = {};
    for (const [phase, count] of Object.entries(phases)) {
      probabilities[name][phase] = +(count / N).toFixed(6);
    }
  }

  self.postMessage({
    type: 'result',
    probabilities,
    elapsed: Date.now() - t0,
    simulations: N,
  });
};
