import { describe, it, expect, vi, afterEach } from 'vitest';
import { mapRowToTodo, fetchTodos, syncNewTodo, syncTodoStatus } from './sheetApi.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mapRowToTodo', () => {
  it('maps a completed row (TRUE) to completed:true', () => {
    expect(mapRowToTodo(['id1', '우유 사기', 'TRUE'])).toEqual({
      id: 'id1',
      text: '우유 사기',
      completed: true,
    });
  });

  it('maps a not-completed row (FALSE) to completed:false', () => {
    expect(mapRowToTodo(['id2', '빨래하기', 'FALSE'])).toEqual({
      id: 'id2',
      text: '빨래하기',
      completed: false,
    });
  });

  it('treats a blank completed cell as completed:false', () => {
    expect(mapRowToTodo(['id3', '청소하기', ''])).toEqual({
      id: 'id3',
      text: '청소하기',
      completed: false,
    });
  });

  it('treats an actual boolean cell value the same as its string form', () => {
    expect(mapRowToTodo(['id4', '설거지', true]).completed).toBe(true);
    expect(mapRowToTodo(['id5', '분리수거', false]).completed).toBe(false);
  });
});

describe('fetchTodos', () => {
  it('fetches rows and maps them to todos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            ['a', '첫번째', 'FALSE'],
            ['b', '두번째', 'TRUE'],
          ]),
      })
    );

    const todos = await fetchTodos();

    expect(todos).toEqual([
      { id: 'a', text: '첫번째', completed: false },
      { id: 'b', text: '두번째', completed: true },
    ]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchTodos()).rejects.toThrow();
  });
});

describe('syncNewTodo / syncTodoStatus', () => {
  it('syncNewTodo posts an add payload', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    syncNewTodo({ id: '1', text: 'a', completed: false });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ type: 'add', id: '1', text: 'a', completed: false });
  });

  it('syncTodoStatus posts an update payload', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    syncTodoStatus('1', true);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ type: 'update', id: '1', completed: true });
  });
});
