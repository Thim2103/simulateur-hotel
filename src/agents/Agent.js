/**
 * @module Agent
 * @description Classe de base des agents de la simulation (clients, personnel...).
 * Gère l'identité, un état interne immuable par copie et un système d'événements minimal.
 */

let nextId = 1;

export class Agent {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id] - Identifiant unique (généré si absent).
   * @param {string} [options.type='agent'] - Type d'agent (ex: 'customer').
   * @param {Object} [options.state={}] - État initial.
   */
  constructor(options = {}) {
    this.id = options.id || `agent-${nextId++}`;
    this.type = options.type || 'agent';
    this.state = { ...(options.state || {}) };
    this.listeners = {};
  }

  /**
   * Retourne une copie de l'état courant.
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Fusionne un état partiel et émet 'change' avec l'état précédent et le nouvel état.
   * @param {Object} partial - Propriétés à mettre à jour.
   * @returns {Agent}
   */
  setState(partial) {
    if (!partial || typeof partial !== 'object') {
      throw new Error('setState attend un objet');
    }
    const previous = this.state;
    this.state = { ...previous, ...partial };
    this.emit('change', { previous: { ...previous }, current: this.getState() });
    return this;
  }

  /**
   * Abonne un callback à un événement.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Fonction de désabonnement.
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Le callback doit être une fonction');
    }
    (this.listeners[event] ||= []).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Désabonne un callback.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const callbacks = this.listeners[event];
    if (!callbacks) return;
    this.listeners[event] = callbacks.filter((cb) => cb !== callback);
  }

  /**
   * Déclenche un événement.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    (this.listeners[event] || []).forEach((cb) => cb(payload, this));
  }

  /**
   * Fait avancer l'agent d'un pas de simulation. À surcharger par les sous-classes.
   * @param {Object} [context={}] - Contexte de simulation (hôtel, monde, tour...).
   * @returns {Agent}
   */
  // eslint-disable-next-line no-unused-vars
  update(context = {}) {
    return this;
  }

  /**
   * Représentation sérialisable de l'agent.
   * @returns {{id: string, type: string, state: Object}}
   */
  toJSON() {
    return { id: this.id, type: this.type, state: this.getState() };
  }
}

export default Agent;
