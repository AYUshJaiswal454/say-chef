import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatMinutes, parseDurations, speakDuration } from './durations';

const secs = (text: string) => parseDurations(text).map(d => d.secs);

describe('parseDurations', () => {
  it('finds minutes, hours and seconds', () => {
    expect(secs('Simmer for 10 minutes.')).toEqual([600]);
    expect(secs('Rest for 2 hours, then slice.')).toEqual([7200]);
    expect(secs('Toast for 30 seconds.')).toEqual([30]);
    expect(secs('Bake 25 mins.')).toEqual([1500]);
    expect(secs('Chill 1 hr.')).toEqual([3600]);
  });

  it('uses the upper bound of a range', () => {
    expect(secs('Cook for 8-10 minutes')).toEqual([600]);
    expect(secs('Cook for 8–10 minutes')).toEqual([600]);
    expect(secs('Leave it 5 to 7 minutes')).toEqual([420]);
  });

  it('understands number words and fractions', () => {
    expect(secs('Stir for one minute')).toEqual([60]);
    expect(secs('Wait a minute')).toEqual([60]);
    expect(secs('Simmer for fifteen minutes')).toEqual([900]);
    expect(secs('Braise for 1½ hours')).toEqual([5400]);
    expect(secs('Braise for 1 1/2 hours')).toEqual([5400]);
    expect(secs('Rest for half an hour')).toEqual([1800]);
  });

  it('finds several times in one step', () => {
    expect(secs('Fry for 2 minutes, then simmer for 20 minutes.')).toEqual([120, 1200]);
  });

  it('ignores temperatures, quantities and implausible times', () => {
    expect(secs('Heat the oven to 180°C.')).toEqual([]);
    expect(secs('Add 2 cups of water.')).toEqual([]);
    expect(secs('Pulse for 2 seconds.')).toEqual([]);
    expect(secs('Ferment for 48 hours.')).toEqual([]);
  });

  it('keeps the phrase that matched', () => {
    expect(parseDurations('Simmer for 10 minutes')[0].phrase).toBe('10 minutes');
  });
});

describe('formatting', () => {
  it('formats durations for display and speech', () => {
    expect(formatDuration(45)).toBe('45 sec');
    expect(formatDuration(90)).toBe('1 min 30 sec');
    expect(formatDuration(5400)).toBe('1 hr 30 min');
    expect(speakDuration(60)).toBe('1 minute');
    expect(speakDuration(3720)).toBe('1 hour 2 minutes');
  });

  it('formats a countdown clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(64_001)).toBe('1:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });

  it('formats recipe totals', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(95)).toBe('1 hr 35 min');
  });
});
