import { describe, it, expect, vi } from 'vitest';
import { Agent } from './Agent.js';

describe('Agent', () => {
  describe('constructor', () => {
    it('devrait générer un id unique et un type par défaut', () => {
      const a = new Agent();
      const b = new Agent();
      expect(a.id).toMatch(/^agent-\d+$/);
      expect(a.id).not.toBe(b.id);
      expect(a.type).toBe('agent');
      expect(a.getState()).toEqual({});
    });

    it('devrait accepter id, type et état initial', () => {
      const initial = { mood: 'happy' };
      const agent = new Agent({ id: 'c1', type: 'customer', state: initial });
      expect(agent.id).toBe('c1');
      expect(agent.type).toBe('customer');
      expect(agent.getState()).toEqual({ mood: 'happy' });
      expect(agent.state).not.toBe(initial);
    });
  });

  describe('getState / setState', () => {
    it('getState devrait retourner une copie', () => {
      const agent = new Agent({ state: { x: 1 } });
      agent.getState().x = 99;
      expect(agent.getState().x).toBe(1);
    });

    it('setState devrait fusionner et être chaînable', () => {
      const agent = new Agent({ state: { x: 1, y: 2 } });
      expect(agent.setState({ y: 3 })).toBe(agent);
      expect(agent.getState()).toEqual({ x: 1, y: 3 });
    });

    it("setState devrait émettre 'change' avec l'état précédent et courant", () => {
      const agent = new Agent({ state: { x: 1 } });
      const listener = vi.fn();
      agent.on('change', listener);
      agent.setState({ x: 2 });
      expect(listener).toHaveBeenCalledWith({ previous: { x: 1 }, current: { x: 2 } }, agent);
    });

    it('setState devrait rejeter une valeur non objet', () => {
      const agent = new Agent();
      expect(() => agent.setState(null)).toThrow('setState attend un objet');
      expect(() => agent.setState(5)).toThrow();
    });
  });

  describe('événements', () => {
    it('emit devrait appeler tous les abonnés', () => {
      const agent = new Agent();
      const a = vi.fn();
      const b = vi.fn();
      agent.on('ping', a);
      agent.on('ping', b);
      agent.emit('ping', 42);
      expect(a).toHaveBeenCalledWith(42, agent);
      expect(b).toHaveBeenCalledWith(42, agent);
    });

    it('la fonction retournée par on() devrait désabonner', () => {
      const agent = new Agent();
      const cb = vi.fn();
      const unsubscribe = agent.on('ping', cb);
      unsubscribe();
      agent.emit('ping');
      expect(cb).not.toHaveBeenCalled();
    });

    it('off() sur un événement inconnu ne devrait pas planter', () => {
      const agent = new Agent();
      expect(() => agent.off('inconnu', () => {})).not.toThrow();
    });

    it('emit sans abonné ne devrait pas planter', () => {
      expect(() => new Agent().emit('rien')).not.toThrow();
    });

    it('on() devrait rejeter un callback non fonction', () => {
      expect(() => new Agent().on('ping', 'pas une fonction')).toThrow();
    });
  });

  describe('update', () => {
    it('devrait être un no-op chaînable par défaut', () => {
      const agent = new Agent({ state: { x: 1 } });
      expect(agent.update()).toBe(agent);
      expect(agent.getState()).toEqual({ x: 1 });
    });

    it('devrait pouvoir être surchargé par une sous-classe', () => {
      class Counter extends Agent {
        update() {
          return this.setState({ ticks: (this.state.ticks || 0) + 1 });
        }
      }
      const counter = new Counter();
      counter.update().update();
      expect(counter.getState().ticks).toBe(2);
    });
  });

  describe('toJSON', () => {
    it('devrait retourner une représentation sérialisable', () => {
      const agent = new Agent({ id: 'a1', type: 'staff', state: { role: 'reception' } });
      expect(JSON.parse(JSON.stringify(agent))).toEqual({
        id: 'a1',
        type: 'staff',
        state: { role: 'reception' },
      });
    });
  });
});
