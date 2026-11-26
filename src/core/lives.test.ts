/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addLives, canPlay, initialLives, LIFE_MS, MAX_LIVES, msToFull, msToNextLife, settleLives, spendLife } from './lives';

const T0 = Date.UTC(2026, 10, 25, 12, 0, 0);

test('başta 5 can, harcayınca azalır, 0 iken harcanamaz', () => {
  let l = initialLives(T0);
  assert.equal(l.count, MAX_LIVES);
  for (let i = 0; i < 5; i++) l = spendLife(l, T0)!;
  assert.equal(l.count, 0);
  assert.equal(spendLife(l, T0), null);
  assert.equal(canPlay(l, T0), false);
});

test('her can 10 dakikada dolar; sayaç ilk harcamada başlar', () => {
  let l = spendLife(initialLives(T0), T0)!; // 4
  l = spendLife(l, T0 + 3 * 60000)!; // 3, sayaç T0'dan
  assert.equal(msToNextLife(l, T0 + 3 * 60000), 7 * 60000);
  assert.equal(settleLives(l, T0 + LIFE_MS).count, 4);
  assert.equal(settleLives(l, T0 + LIFE_MS * 2 - 1).count, 4);
  assert.equal(settleLives(l, T0 + LIFE_MS * 2).count, 5);
  assert.equal(settleLives(l, T0 + LIFE_MS * 20).count, 5);
  assert.equal(msToFull(l, T0), 2 * LIFE_MS);
});

test('dolan can sayaçta kalanı korur', () => {
  let l = initialLives(T0);
  for (let i = 0; i < 3; i++) l = spendLife(l, T0)!; // 2
  const s = settleLives(l, T0 + LIFE_MS * 1.5); // 3, yarım can sayılıyor
  assert.equal(s.count, 3);
  assert.equal(msToNextLife(s, T0 + LIFE_MS * 1.5), LIFE_MS / 2);
});

test('can eklemek en fazla 5 yapar; saat geri gitse can eksilmez', () => {
  let l = spendLife(spendLife(initialLives(T0), T0)!, T0)!;
  l = addLives(l, 10, T0);
  assert.equal(l.count, 5);
  const back = settleLives({ count: 2, since: T0 }, T0 - LIFE_MS * 5);
  assert.equal(back.count, 2);
});
