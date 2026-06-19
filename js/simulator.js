/**
 * js/simulator.js — Orquestrador do Web Worker
 *
 * Responsabilidades:
 *   – Instanciar worker.js
 *   – Receber dados de grupos + ratings atualizados via api.js
 *   – Expor run(onProgress, onResult) para ui.js
 *   – Emitir callbacks de progresso e resultado
 */

'use strict';

const Simulator = (() => {
  let _worker = null;

  /**
   * Mata o worker em andamento (se houver) e cria um novo.
   * Necessário porque workers não têm "abort" nativo — recriamos o objeto.
   */
  function _spawnWorker() {
    if (_worker) {
      _worker.terminate();
      _worker = null;
    }
    _worker = new Worker('js/worker.js');
    return _worker;
  }

  /**
   * Executa a simulação Monte Carlo.
   *
   * @param {Object}   options
   * @param {number}   [options.simulations=100000]  Número de simulações.
   * @param {Function} options.onProgress            Callback({ done, total, pct }).
   * @param {Function} options.onResult              Callback({ probabilities, elapsed, simulations }).
   * @param {Function} [options.onError]             Callback(Error).
   */
  function run({ simulations = 100_000, onProgress, onResult, onError } = {}) {
    // GROUPS e applyEloRatings são globais definidos em data/groups.js
    const groups = window.GROUPS;
    if (!groups) {
      const err = new Error('GROUPS não definido — verifique data/groups.js');
      if (onError) onError(err);
      else console.error(err);
      return;
    }

    // Clona os grupos para não mutar o objeto global durante a simulação
    const groupsSnapshot = JSON.parse(JSON.stringify(groups));

    const worker = _spawnWorker();

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        const pct = Math.round((data.done / data.total) * 100);
        if (onProgress) onProgress({ done: data.done, total: data.total, pct });
      } else if (data.type === 'result') {
        if (onResult) onResult({
          probabilities: data.probabilities,
          elapsed:       data.elapsed,
          simulations:   data.simulations,
        });
        // Worker termina naturalmente após postar o resultado
        _worker = null;
      }
    };

    worker.onerror = (event) => {
      const err = new Error(`Worker error: ${event.message} (${event.filename}:${event.lineno})`);
      if (onError) onError(err);
      else console.error(err);
      _worker = null;
    };

    worker.postMessage({ groups: groupsSnapshot, simulations });
  }

  /** Cancela simulação em andamento. */
  function cancel() {
    if (_worker) {
      _worker.terminate();
      _worker = null;
    }
  }

  /** Indica se há simulação rodando. */
  function isRunning() {
    return _worker !== null;
  }

  return { run, cancel, isRunning };
})();

window.Simulator = Simulator;
