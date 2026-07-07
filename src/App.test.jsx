import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

function stubFetch({ initialRows = [], failInitialLoad = false, failWrites = false } = {}) {
  const fetchMock = vi.fn((url, options) => {
    if (!options) {
      if (failInitialLoad) return Promise.reject(new Error('network error'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(initialRows) });
    }
    if (failWrites) return Promise.reject(new Error('network error'));
    return Promise.resolve({ ok: true });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('loads todos from the sheet on mount and renders them', async () => {
    stubFetch({
      initialRows: [
        ['a', '첫번째', 'FALSE'],
        ['b', '두번째', 'TRUE'],
      ],
    });

    render(<App />);

    expect(await screen.findByText('첫번째')).toBeInTheDocument();
    const second = screen.getByText('두번째');
    expect(second).toBeInTheDocument();
    expect(second.closest('li')).toHaveClass('completed');
  });

  it('shows an error message when the initial load fails', async () => {
    stubFetch({ failInitialLoad: true });

    render(<App />);

    expect(await screen.findByText('할 일을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('adds a new todo and syncs it to the sheet', async () => {
    const fetchMock = stubFetch();
    const user = userEvent.setup();

    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText('할 일을 입력하세요'), '새 할 일');
    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByText('새 할 일')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('할 일을 입력하세요')).toHaveValue('');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).toMatchObject({ type: 'add', text: '새 할 일', completed: false });
  });

  it('does not add an empty todo', async () => {
    stubFetch();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('marks a new todo as sync-failed when the add request fails', async () => {
    stubFetch({ failWrites: true });
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByPlaceholderText('할 일을 입력하세요'), '실패할 할 일');
    await user.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() =>
      expect(screen.getByText('실패할 할 일').closest('li')).toHaveClass('sync-failed')
    );
  });

  it('toggles completion and syncs the new status to the sheet', async () => {
    const fetchMock = stubFetch({ initialRows: [['a', '할 일', 'FALSE']] });

    render(<App />);
    const checkbox = await screen.findByRole('checkbox');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText('할 일').closest('li')).toHaveClass('completed');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).toEqual({ type: 'update', id: 'a', completed: true });
  });

  it('keeps the local completed state but marks sync-failed when the toggle request fails', async () => {
    stubFetch({ initialRows: [['a', '할 일', 'FALSE']], failWrites: true });

    render(<App />);
    const checkbox = await screen.findByRole('checkbox');
    await userEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    await waitFor(() =>
      expect(screen.getByText('할 일').closest('li')).toHaveClass('sync-failed')
    );
  });
});
