/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MissionState,
  applyWin,
  canClaimChest,
  canClaimMission,
  claimMission,
  ensureMissions,
  freshMissions,
  missionsFor,
  missionsLeft,
} from './missions';
import { planNotifications, streakAtRisk } from './notifyPlan';

test('günün görevleri: 3 tane, farklı türler, herkese aynı', () => {
  const m = missionsFor('2026-11-22');
  assert.equal(m.length, 3);
  assert.equal(new Set(m.map((x) => x.kind)).size, 3);
  assert.deepEqual(m, missionsFor('2026-11-22'));
  assert.equal(ensureMissions(freshMissions('2026-11-21'), '2026-11-22').day, '2026-11-22');
});

test('görev ilerlemesi, ödül, sandık', () => {
  let s: MissionState = {
    ...freshMissions('d'),
    missions: [
      { kind: 'win', target: 2, reward: 20 },
      { kind: 'launches', target: 10, reward: 15 },
      { kind: 'noHelp', target: 1, reward: 30 },
    ],
  };
  s = applyWin(s, { stars: 3, launches: 6, usedHelp: true, isDaily: false, hard: false });
  assert.deepEqual(s.progress, [1, 6, 0]);
  s = applyWin(s, { stars: 1, launches: 6, usedHelp: false, isDaily: false, hard: false });
  assert.deepEqual(s.progress, [2, 10, 1]);
  assert.equal(canClaimMission(s, 0), true);
  let coins = 0;
  for (let i = 0; i < 3; i++) {
    const r = claimMission(s, i);
    s = r.state;
    coins += r.coins;
  }
  assert.equal(coins, 65);
  assert.equal(claimMission(s, 0).coins, 0); // ikinci kez yok
  assert.equal(canClaimChest(s), true);
  assert.equal(missionsLeft(s), false);
});

test('bildirim planı: günde en fazla bir, seri tehlikedeyse öncelik', () => {
  const now = new Date(2026, 10, 22, 10, 0);
  const plan = planNotifications({
    now,
    todayKey: '2026-11-22',
    dailyDoneKey: '2026-11-21',
    streak: 4,
    piggyFull: false,
    missionsLeft: true,
  });
  assert.equal(plan[0].id, 'streak');
  assert.equal(new Set(plan.map((p) => p.at.toDateString())).size, plan.length);
  assert.equal(streakAtRisk('2026-11-20', '2026-11-22', 4), false);
  const done = planNotifications({
    now,
    todayKey: '2026-11-22',
    dailyDoneKey: '2026-11-22',
    streak: 4,
    piggyFull: false,
    missionsLeft: false,
  });
  assert.equal(done[0].id, 'daily');
  assert.ok(done[0].at.getDate() !== now.getDate());
});
