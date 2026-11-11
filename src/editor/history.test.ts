import { describe, expect, test } from 'vitest';
import { addComponent } from '../core/edit';
import { createEmptyProject, type Project } from '../core/types';
import { EMPTY_HISTORY, HISTORY_LIMIT, record, redo, sameProject, undo } from './history';

const empty = createEmptyProject();
const one = addComponent(empty, 'installation', 'lamp', { x: 5, y: 5 }).project;
const two = addComponent(one, 'installation', 'mcb1p', { x: 9, y: 5 }).project;

describe('riwayat', () => {
  test('tanpa riwayat tidak ada yang bisa diurungkan atau diulangi', () => {
    expect(undo(EMPTY_HISTORY, empty)).toBeNull();
    expect(redo(EMPTY_HISTORY, empty)).toBeNull();
  });

  test('urungkan mengembalikan keadaan sebelumnya, ulangi memajukannya lagi', () => {
    const history = record(record(EMPTY_HISTORY, empty), one);
    const back = undo(history, two);
    expect(back?.project).toBe(one);
    const backAgain = back && undo(back.history, back.project);
    expect(backAgain?.project).toBe(empty);
    expect(backAgain && undo(backAgain.history, backAgain.project)).toBeNull();

    const forward = backAgain && redo(backAgain.history, backAgain.project);
    expect(forward?.project).toBe(one);
    const forwardAgain = forward && redo(forward.history, forward.project);
    expect(forwardAgain?.project).toBe(two);
    expect(forwardAgain && redo(forwardAgain.history, forwardAgain.project)).toBeNull();
  });

  test('perubahan baru menghanguskan langkah ulangi', () => {
    const back = undo(record(EMPTY_HISTORY, empty), one);
    expect(back?.history.future).toHaveLength(1);
    expect(back && record(back.history, back.project).future).toEqual([]);
  });

  test('riwayat dibatasi', () => {
    let history = EMPTY_HISTORY;
    const projects: Project[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      const project = addComponent(empty, 'installation', 'lamp', { x: i, y: 0 }).project;
      projects.push(project);
      history = record(history, project);
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(projects[5]);
  });

  test('sameProject membandingkan isi, bukan identitas', () => {
    expect(sameProject(one, structuredClone(one))).toBe(true);
    expect(sameProject(one, two)).toBe(false);
  });
});
