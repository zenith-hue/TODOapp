import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mapRowToTodo,
  renderTodo,
  addTodo,
  loadTodos,
  syncNewTodo,
  syncTodoStatus,
} from './script.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// 1. ES 모듈 전환 확인
describe('ES module', () => {
  it('exports functions that can be imported', () => {
    expect(typeof mapRowToTodo).toBe('function');
    expect(typeof renderTodo).toBe('function');
    expect(typeof addTodo).toBe('function');
    expect(typeof loadTodos).toBe('function');
  });
});

// 2. mapRowToTodo
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
});

// 3. renderTodo
describe('renderTodo', () => {
  it('renders an incomplete todo without the completed class and an unchecked box', () => {
    const li = renderTodo({ id: 'a', text: '할 일 1', completed: false });
    expect(li.tagName).toBe('LI');
    expect(li.classList.contains('completed')).toBe(false);
    expect(li.querySelector('span').textContent).toBe('할 일 1');
    expect(li.querySelector('input[type="checkbox"]').checked).toBe(false);
  });

  it('renders a completed todo with the completed class and a checked box', () => {
    const li = renderTodo({ id: 'b', text: '할 일 2', completed: true });
    expect(li.classList.contains('completed')).toBe(true);
    expect(li.querySelector('input[type="checkbox"]').checked).toBe(true);
  });
});

// 4. loadTodos
describe('loadTodos', () => {
  it('fetches rows and renders them into the list', async () => {
    const list = document.createElement('ul');
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

    await loadTodos(list, null);

    expect(list.children.length).toBe(2);
    expect(list.children[0].querySelector('span').textContent).toBe('첫번째');
    expect(list.children[1].classList.contains('completed')).toBe(true);
  });

  it('renders nothing when the sheet is empty', async () => {
    const list = document.createElement('ul');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    );

    await loadTodos(list, null);

    expect(list.children.length).toBe(0);
  });
});

// 5. 읽기 실패 에러 처리
describe('loadTodos error handling', () => {
  it('shows an error message and keeps the list empty when fetch rejects', async () => {
    const list = document.createElement('ul');
    const errorEl = document.createElement('p');
    errorEl.hidden = true;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    await expect(loadTodos(list, errorEl)).resolves.not.toThrow();

    expect(list.children.length).toBe(0);
    expect(errorEl.hidden).toBe(false);
    expect(errorEl.textContent).not.toBe('');
  });

  it('shows an error message when the response is not ok', async () => {
    const list = document.createElement('ul');
    const errorEl = document.createElement('p');
    errorEl.hidden = true;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await loadTodos(list, errorEl);

    expect(list.children.length).toBe(0);
    expect(errorEl.hidden).toBe(false);
  });
});

// 6. addTodo가 새 할 일을 전송
describe('addTodo sync', () => {
  it('sends the new todo to the sheet and updates the DOM immediately', () => {
    const input = document.createElement('input');
    input.value = '새 할 일';
    const list = document.createElement('ul');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    addTodo(input, list);

    expect(list.children.length).toBe(1);
    expect(list.children[0].querySelector('span').textContent).toBe('새 할 일');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(options.method).toBe('POST');
    expect(body.text).toBe('새 할 일');
    expect(body.completed).toBe(false);
    expect(input.value).toBe('');
  });
});

// 7. 추가 전송 실패 처리
describe('addTodo sync failure', () => {
  it('marks the item as sync-failed when the POST rejects, without throwing', async () => {
    const input = document.createElement('input');
    input.value = '실패할 할 일';
    const list = document.createElement('ul');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

    expect(() => addTodo(input, list)).not.toThrow();
    // microtask 큐가 비워질 때까지 대기
    await new Promise((r) => setTimeout(r, 0));

    expect(list.children[0].classList.contains('sync-failed')).toBe(true);
  });
});

// 8. 체크박스 토글 시 완료 상태 전송
describe('toggle sync', () => {
  it('sends the updated completed status when the checkbox changes', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const li = renderTodo({ id: 'xyz', text: '할 일', completed: false }, syncTodoStatus);
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    expect(li.classList.contains('completed')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.id).toBe('xyz');
    expect(body.completed).toBe(true);
  });
});

// 9. 토글 전송 실패 처리
describe('toggle sync failure', () => {
  it('keeps the local completed state but marks sync-failed when the update POST rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

    const li = renderTodo({ id: 'xyz', text: '할 일', completed: false }, syncTodoStatus);
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    await new Promise((r) => setTimeout(r, 0));

    expect(li.classList.contains('completed')).toBe(true);
    expect(li.classList.contains('sync-failed')).toBe(true);
  });
});

describe('syncNewTodo / syncTodoStatus', () => {
  it('syncNewTodo posts an add payload', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    syncNewTodo({ id: '1', text: 'a', completed: false });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.type).toBe('add');
  });

  it('syncTodoStatus posts an update payload', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    syncTodoStatus('1', true);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.type).toBe('update');
    expect(body.completed).toBe(true);
  });
});
