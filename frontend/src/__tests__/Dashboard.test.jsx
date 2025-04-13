import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CellSelect from '../pages/dashboard/components/CellSelect';
import CopyLinkBtn from '../pages/dashboard/components/CopyLinkBtn';
import { DateTime } from 'luxon';
import PropTypes from 'prop-types';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const queryClient = new QueryClient();
const mockedSetSelectedCells = vi.fn();
const DateTimeNow = DateTime.now();

const MockCellSelect = ({ selectedCells, setSelectedCells }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <CellSelect selectedCells={selectedCells} setSelectedCells={setSelectedCells} />
    </QueryClientProvider>
  );
};

MockCellSelect.propTypes = {
  selectedCells: PropTypes.array,
  setSelectedCells: PropTypes.func,
};

//** integration test: service calls on dashboard */
describe('Loading dashboard', () => {
  it('should load cell select as unselected', async () => {
    render(<MockCellSelect selectedCells={[]} setSelectedCells={mockedSetSelectedCells} />);
    const cellSelectElement = await screen.findByText('select-cell');
    expect(cellSelectElement).toBeInTheDocument();
  });
  it('should load copy link button', async () => {
    render(<CopyLinkBtn startDate={DateTimeNow} endDate={DateTimeNow} selectedCells={[]} />);
    const copyLinkButton = await screen.findByLabelText('Copy Link');
    expect(copyLinkButton).toBeInTheDocument();
  });
  it('should display mocked cell names when dropdown is open', async () => {
    const user = userEvent.setup();
    render(<MockCellSelect selectedCells={[]} setSelectedCells={mockedSetSelectedCells} />);
    const cellDropDownButton = screen.getByLabelText('Cell');
    await user.click(cellDropDownButton);
    expect(await screen.findByText('test_cell_1')).toBeInTheDocument();
    expect(await screen.findByText('test_cell_2')).toBeInTheDocument();
  });
});

describe('Testing copy functionality', () => {
  it('should copy a URL with the correct cellID QueryParam of 1,2', async () => {
    const writeTextMock = vi.fn();
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock);

    const user = userEvent.setup();
    const selectedCells = [{ id: 1 }, { id: 2 }];
    render(<CopyLinkBtn startDate={DateTimeNow} endDate={DateTimeNow} selectedCells={selectedCells} />);
    const copyLinkButton = screen.getByLabelText('Copy Link');
    await user.click(copyLinkButton);
    const copiedText = `http://localhost:3000/dashboard?cell_id=${selectedCells
      .map((cell) => cell.id)
      .join(',')}&startDate=${DateTimeNow}&endDate=${DateTimeNow}`;

    expect(writeTextMock).toHaveBeenCalledWith(copiedText);

    vi.restoreAllMocks();
  });

  it('should copy a URL with the correct cellID QueryParam of 12', async () => {
    const writeTextMock = vi.fn();
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock);

    const user = userEvent.setup();
    const selectedCells = [{ id: 12 }];
    render(<CopyLinkBtn startDate={DateTimeNow} endDate={DateTimeNow} selectedCells={selectedCells} />);
    const copyLinkButton = screen.getByLabelText('Copy Link');
    await user.click(copyLinkButton);
    const copiedText = `http://localhost:3000/dashboard?cell_id=${selectedCells
      .map((cell) => cell.id)
      .join(',')}&startDate=${DateTimeNow}&endDate=${DateTimeNow}`;

    expect(writeTextMock).toHaveBeenCalledWith(copiedText);

    vi.restoreAllMocks();
  });

  it('should copy a URL with the correct startDate QueryParam', async () => {
    const writeTextMock = vi.fn();
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock);
    const startDate = DateTime.now().minus({ days: 14 });

    const user = userEvent.setup();
    render(<CopyLinkBtn startDate={startDate} endDate={DateTimeNow} selectedCells={[]} />);
    const copyLinkButton = screen.getByLabelText('Copy Link');
    await user.click(copyLinkButton);
    const copiedText = `http://localhost:3000/dashboard?cell_id=&startDate=${startDate}&endDate=${DateTimeNow}`;

    expect(writeTextMock).toHaveBeenCalledWith(copiedText);

    vi.restoreAllMocks();
  });

  it('should copy a URL with the correct endDate QueryParam', async () => {
    const writeTextMock = vi.fn();
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock);
    const endDate = DateTime.now().minus({ days: 14 });

    const user = userEvent.setup();
    render(<CopyLinkBtn startDate={DateTimeNow} endDate={endDate} selectedCells={[]} />);
    const copyLinkButton = screen.getByLabelText('Copy Link');
    await user.click(copyLinkButton);
    const copiedText = `http://localhost:3000/dashboard?cell_id=&startDate=${DateTimeNow}&endDate=${endDate}`;
    expect(writeTextMock).toHaveBeenCalledWith(copiedText);

    vi.restoreAllMocks();
  });
});


const server = setupServer(
  rest.get('/api/cell', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'test_cell_1', archive: false },
        { id: 2, name: 'test_cell_2', archive: false }
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CellSelect Delete Functionality', () => {
  it('should show delete confirmation and delete cell', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);
    
    render(<MockCellSelect selectedCells={[]} setSelectedCells={mockedSetSelectedCells} />);

    await screen.findByLabelText('Cell');
    const cellDropdown = screen.getByLabelText('Cell');
    await user.click(cellDropdown);

    const cell = await screen.findByText('test_cell_1', {}, { timeout: 2000 });
    await user.click(cell);
    
    const moreButtons = screen.getAllByTestId('more-vert-icon');
    const moreButton = moreButtons[0];
    await user.click(moreButton);

    const deleteButton = await screen.findByText(/delete cell/i);
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this cell?');
  });
});
