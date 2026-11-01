import { describe, expect, it } from 'vitest';
import { normaliseTranscript, parseCommand } from './commands';

const type = (t: string) => parseCommand(t)?.type ?? null;

describe('parseCommand', () => {
  it('handles navigation', () => {
    expect(type('next')).toBe('next');
    expect(type('Next step please.')).toBe('next');
    expect(type('okay, continue')).toBe('next');
    expect(type('go back')).toBe('prev');
    expect(type('previous')).toBe('prev');
    expect(type('repeat that')).toBe('repeat');
    expect(type('say that again')).toBe('repeat');
  });

  it('jumps to a numbered step', () => {
    expect(parseCommand('go to step 3')).toEqual({ type: 'goto', step: 3 });
    expect(parseCommand('step five')).toEqual({ type: 'goto', step: 5 });
    expect(parseCommand('skip to the last step')).toEqual({ type: 'goto', step: -1 });
  });

  it('handles timers', () => {
    expect(type('start the timer')).toBe('startTimer');
    expect(type('set timer')).toBe('startTimer');
    expect(parseCommand('set a timer for 5 minutes')).toEqual({ type: 'customTimer', secs: 300 });
    expect(parseCommand('timer for ten seconds')).toEqual({ type: 'customTimer', secs: 10 });
    expect(parseCommand('remind me in 2 hours')).toBeNull();
    expect(parseCommand('remind me for 2 hours')).toEqual({ type: 'customTimer', secs: 7200 });
    expect(type('how much time left')).toBe('timeLeft');
    expect(type('stop the alarm')).toBe('dismissAlarms');
  });

  it('answers ingredient questions', () => {
    expect(type('what ingredients do I need')).toBe('stepIngredients');
    expect(type('read all the ingredients')).toBe('allIngredients');
    expect(parseCommand('how much salt do I need')).toEqual({ type: 'howMuch', query: 'salt' });
    expect(parseCommand('How many tomatoes?')).toEqual({ type: 'howMuch', query: 'tomatoes' });
  });

  it('handles stop, exit, help and peek', () => {
    expect(type('stop')).toBe('stop');
    expect(type('shh')).toBe('stop');
    expect(type('exit')).toBe('exit');
    expect(type('stop cooking')).toBe('exit');
    expect(type('what can I say')).toBe('help');
    expect(type("what's next")).toBe('peek');
  });

  it('accepts a "hey chef" prefix', () => {
    expect(normaliseTranscript('Hey Chef, next!')).toBe('next');
    expect(type('OK chef repeat')).toBe('repeat');
  });

  it('ignores chatter', () => {
    expect(parseCommand('this smells amazing')).toBeNull();
    expect(parseCommand('')).toBeNull();
  });
});
