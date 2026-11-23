/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDockSlot,
  boardOne,
  exitVehicle,
  cellsOf,
  exitPath,
  initialState,
  Level,
  legalMoves,
  pathClear,
  settle,
  starsFor,
  State,
  tap,
  Vehicle,
  vipPatienceLeft,
  extendVip,
  reopen,
} from './rules';
import { solve } from './solver';
import { dailyLevel, difficultyFor, FEATURE_LEVEL, levelFor } from './generator';

const ok = (r: State | string): State => {
  if (typeof r === 'string') throw new Error(r);
  return r;
};

// 4x3 otopark:
//  satır 0: A (araba, sağa bakar) x=0..1      → önü açık
//  satır 1: B (araba, yukarı bakar) x=1, y=1..2 → önünde A var
const A: Vehicle = { id: 0, kind: 'car', color: 0, x: 0, y: 0, dir: 'right' };
const B: Vehicle = { id: 1, kind: 'car', color: 1, x: 1, y: 1, dir: 'up' };
const mini = (queue: number[], dockSize = 2): Level => ({
  id: 't',
  w: 4,
  h: 3,
  vehicles: [A, B],
  queue,
  dockSize,
  par: 1,
});

test('hücreler ve çıkış yolu', () => {
  assert.deepEqual(cellsOf(A, 4), [0, 1]);
  assert.deepEqual(exitPath(A, 4, 3), [2, 3]);
  assert.deepEqual(cellsOf(B, 4), [5, 9]);
  assert.deepEqual(exitPath(B, 4, 3), [1]);
  const lvl = mini([]);
  const s0 = initialState(lvl);
  assert.equal(pathClear(lvl, s0, A), true);
  assert.equal(pathClear(lvl, s0, B), false);
});

test('önü kapalı araç çıkamaz, açılınca çıkar', () => {
  const lvl = mini([0, 0, 0, 0, 1, 1, 1, 1]);
  const s = initialState(lvl);
  assert.equal(tap(lvl, s, 1), 'blocked');
  assert.deepEqual(legalMoves(lvl, s), [0]);
  const s1 = ok(tap(lvl, s, 0)); // A çıkar, 4 kırmızı yolcu biner, A gider
  assert.equal(s1.qi, 4);
  assert.equal(s1.departed, 1);
  assert.equal(s1.dock.every((p) => p === null), true);
  const s2 = ok(tap(lvl, s1, 1));
  assert.equal(s2.status, 'won');
  assert.equal(starsFor(lvl, s2), 3);
});

test('yolcu öndeki renk tutmazsa bekler; renk gelince biner', () => {
  const lvl = mini([1, 0, 0, 0, 0, 1, 1, 1]);
  const s1 = ok(tap(lvl, initialState(lvl), 0)); // A durakta, öndeki yolcu mavi: kimse binmez
  assert.equal(s1.qi, 0);
  assert.equal(s1.dock[0]?.filled, 0);
  const s2 = ok(tap(lvl, s1, 1)); // B gelir: mavi biner, sonra 4 kırmızı A'ya, A gider
  assert.equal(s2.qi, 8); // ardından kalan 3 mavi B'ye biner, B de gider
  assert.equal(s2.peak, 2);
  assert.equal(s2.status, 'won');
});

test('durak doluyken binemeyen yolcu = tıkanma; +1 yer kurtarır', () => {
  // 2 araç da durağa gelmeli ama tek yer var ve öndeki yolcu 3. bir renk değil; kurgu:
  const C: Vehicle = { id: 2, kind: 'car', color: 2, x: 3, y: 1, dir: 'down' };
  const lvl: Level = { id: 't2', w: 4, h: 3, vehicles: [A, B, C], queue: [2, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2], dockSize: 1, par: 1 };
  const s1 = ok(tap(lvl, initialState(lvl), 0)); // A durakta, öndeki yolcu yeşil: binemez, durak dolu
  assert.equal(s1.status, 'stuck');
  assert.equal(tap(lvl, s1, 2), 'over');
  const r = addDockSlot(lvl, s1);
  assert.equal(r.status, 'playing');
  const s2 = ok(tap(lvl, r, 2));
  assert.equal(s2.qi, 5); // yeşil C'ye, 4 kırmızı A'ya
  const s3 = ok(tap(lvl, s2, 1));
  assert.equal(s3.status, 'won');
});

test('yolcu aynı renkte önce gelen araca biner', () => {
  const A2: Vehicle = { ...A, color: 1 };
  const D: Vehicle = { id: 3, kind: 'car', color: 1, x: 3, y: 1, dir: 'down' };
  const E: Vehicle = { id: 2, kind: 'car', color: 2, x: 0, y: 1, dir: 'down' };
  const lvl: Level = { id: 't3', w: 4, h: 3, vehicles: [A2, E, D], queue: [2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2], dockSize: 3, par: 3 };
  let s = ok(tap(lvl, initialState(lvl), 3)); // D önce gelir (yer 0)
  s = ok(tap(lvl, s, 0)); // A2 sonra (yer 1)
  assert.equal(s.qi, 0); // öndeki yolcu yeşil: kimse binmez
  let e = ok(exitVehicle(lvl, s, 2)); // E (yer 2)
  const order: number[] = [];
  for (let st = boardOne(lvl, e); st; st = boardOne(lvl, e)) {
    order.push(st.slot);
    e = st.state;
  }
  assert.deepEqual(order.slice(0, 6), [2, 0, 0, 0, 0, 1]);
  assert.equal(settle(lvl, e).status, 'won');
});

/** Üreticinin çözümü: kimlikleri büyükten küçüğe (son yerleştirilen önce çıkar) */
function playIntended(lvl: Level): State {
  let s = initialState(lvl);
  for (const v of lvl.vehicles.slice().reverse()) {
    s = ok(tap(lvl, s, v.id));
    assert.notEqual(s.status, 'stuck', `${lvl.id}: çözüm tıkandı`);
  }
  return s;
}

test('ilk 120 seviye üreticinin çözümüyle 3 yıldızla biter', () => {
  for (let n = 1; n <= 120; n++) {
    const lvl = levelFor(n);
    const total = lvl.vehicles.reduce((k, v) => k + (v.kind === 'car' ? 4 : v.kind === 'bus' ? 6 : 8), 0);
    assert.equal(lvl.queue.length, total, `${lvl.id}: yolcu sayısı koltuk sayısına eşit`);
    assert.ok(lvl.par <= lvl.dockSize);
    const s = playIntended(lvl);
    assert.equal(s.status, 'won', lvl.id);
    assert.equal(starsFor(lvl, s), 3, lvl.id);
  }
});

test('seviyeler tohumlu: aynı numara aynı seviye', () => {
  assert.deepEqual(levelFor(17), levelFor(17));
  assert.notDeepEqual(levelFor(17).vehicles, levelFor(18).vehicles);
});

test('çözücü ilk 60 seviyeyi ve günlükleri çözer', () => {
  for (let n = 1; n <= 60; n++) {
    const lvl = levelFor(n);
    const r = solve(lvl, initialState(lvl), 40000);
    assert.ok(r.moves, `${lvl.id} çözülemedi (sınır: ${r.exhausted})`);
  }
  for (const key of ['2026-11-22', '2026-11-23', '2027-01-01']) {
    const lvl = dailyLevel(key);
    playIntended(lvl);
    assert.ok(solve(lvl, initialState(lvl), 40000).moves, key);
  }
});

test('zorluk eğrisi büyür', () => {
  assert.ok(difficultyFor(1).w * difficultyFor(1).h < difficultyFor(60).w * difficultyFor(60).h);
  assert.equal(difficultyFor(10).dockSize, 4);
  assert.equal(difficultyFor(11).dockSize, 5);
  assert.ok([30, 31, 32, 33].some((n) => levelFor(n).vehicles.some((v) => v.kind === 'truck')));
  assert.ok(levelFor(1).vehicles.length <= 5);
});

test('bariyer: yeterli araç yola çıkınca kalkar', () => {
  // C (aşağı bakar, x=3) bariyer yüzünden çıkamaz; bariyer 1 araç gidince kalkar
  const C: Vehicle = { id: 2, kind: 'car', color: 2, x: 3, y: 0, dir: 'down' };
  const lvl: Level = {
    id: 'b', w: 4, h: 3, vehicles: [A, C], queue: [0, 0, 0, 0, 2, 2, 2, 2], dockSize: 2, par: 1,
    barriers: [{ cell: 2 * 4 + 3, need: 1 }],
  };
  // A'nın yolu (hücre 2,3) C'nin üstünden geçiyor: A önce çıkamaz, C de bariyerde
  const s0 = initialState(lvl);
  assert.equal(tap(lvl, s0, 2), 'blocked');
  assert.equal(tap(lvl, s0, 0), 'blocked');
  assert.equal(s0.status, 'playing');
  // vinç C'yi kaldırır, sonra A çıkar, 4 kırmızı biner, A gider
  const s1 = ok(tap(lvl, s0, 2, true));
  const s2 = ok(tap(lvl, s1, 0));
  assert.equal(s2.status, 'won');
  // vinçsiz: önce A giderse bariyer kalkar (başka bir düzen)
  const C2: Vehicle = { ...C, x: 2, y: 1, dir: 'down' };
  const l2: Level = { ...lvl, vehicles: [A, C2], barriers: [{ cell: 2 * 4 + 2, need: 1 }] };
  let s = ok(tap(l2, initialState(l2), 0));
  assert.equal(s.departed, 1);
  s = ok(tap(l2, s, 2));
  assert.equal(s.status, 'won');
});

test('kilitli araç: anahtar renginde bir araç gidince açılır', () => {
  const C: Vehicle = { id: 2, kind: 'car', color: 2, x: 3, y: 1, dir: 'down' };
  const lvl: Level = { id: 'k', w: 4, h: 3, vehicles: [A, C], queue: [0, 0, 0, 0, 2, 2, 2, 2], dockSize: 2, par: 1, locks: [{ id: 2, key: 0 }] };
  const s0 = initialState(lvl);
  assert.equal(tap(lvl, s0, 2), 'locked');
  assert.deepEqual(legalMoves(lvl, s0), [0]);
  const s1 = ok(tap(lvl, s0, 0)); // kırmızı A gider, kilit açılır
  assert.deepEqual(legalMoves(lvl, s1), [2]);
  assert.equal(ok(tap(lvl, s1, 2)).status, 'won');
});

test('çıkabilecek araç kalmazsa tıkanma (noMove), vinç kurtarır', () => {
  const C: Vehicle = { id: 2, kind: 'car', color: 2, x: 3, y: 1, dir: 'down' };
  // C'nin kilidi yeşil (2) bir aracın gitmesini bekliyor ama tek yeşil araç C: kilitlenme
  const lvl: Level = { id: 'n', w: 4, h: 3, vehicles: [A, C], queue: [2, 2, 2, 2, 0, 0, 0, 0], dockSize: 3, par: 1, locks: [{ id: 2, key: 2 }] };
  const s1 = ok(tap(lvl, initialState(lvl), 0));
  assert.equal(s1.status, 'stuck');
  assert.equal(s1.reason, 'noMove');
  const s2 = ok(tap(lvl, reopen(s1), 2, true));
  assert.equal(s2.status, 'won');
});

test('VIP yolcu: sabrı biterse kaybedilir, ek sabır kurtarır', () => {
  const C: Vehicle = { id: 2, kind: 'car', color: 2, x: 3, y: 1, dir: 'down' };
  const D: Vehicle = { id: 3, kind: 'car', color: 3, x: 0, y: 1, dir: 'down' };
  // Kuyruk: 4 kırmızı, sonra VIP mavi (B), ...
  const lvl: Level = {
    id: 'v', w: 4, h: 3, vehicles: [A, B, C, D],
    queue: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], dockSize: 4, par: 2, vip: { qi: 4, patience: 1 },
  };
  let s = ok(tap(lvl, initialState(lvl), 0)); // A gider; VIP öne geldi, sabır 1
  assert.equal(vipPatienceLeft(lvl, s), 1);
  s = ok(tap(lvl, s, 2)); // yanlış araç: sabır biter
  assert.equal(s.status, 'stuck');
  assert.equal(s.reason, 'vip');
  s = extendVip(lvl, s, 2);
  assert.equal(s.status, 'playing');
  s = ok(tap(lvl, s, 1)); // B gelir, VIP biner
  assert.ok(s.qi > 4);
});

test('engeller seviyelerde doğru yerde başlıyor ve çözüm geçerli kalıyor', () => {
  assert.ok(!levelFor(FEATURE_LEVEL.barrier - 1).barriers);
  assert.ok(levelFor(FEATURE_LEVEL.barrier).barriers?.length);
  assert.ok(levelFor(FEATURE_LEVEL.lock).locks?.length);
  assert.ok(levelFor(FEATURE_LEVEL.vip).vip);
  let b = 0, l = 0, v = 0;
  for (let n = 1; n <= 150; n++) {
    const lvl = levelFor(n);
    b += lvl.barriers?.length ?? 0;
    l += lvl.locks?.length ?? 0;
    v += lvl.vip ? 1 : 0;
    const s = playIntended(lvl);
    assert.equal(s.status, 'won', lvl.id);
  }
  assert.ok(b > 100 && l > 80 && v > 40, `${b} ${l} ${v}`);
});
