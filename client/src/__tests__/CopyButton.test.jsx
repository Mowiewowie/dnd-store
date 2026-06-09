import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { CopyButton } from '../components/CopyButton.jsx';

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  });
  return writeText;
}

describe('CopyButton', () => {
  it('renders a button with no text — icon only, no "Copy" label', () => {
    render(<CopyButton text="hello" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText(/^copy$/i)).not.toBeInTheDocument();
  });

  it('has an accessible title attribute before copying', () => {
    render(<CopyButton text="hello" />);
    expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
  });

  it('calls navigator.clipboard.writeText with the exact text prop', async () => {
    const writeText = mockClipboard();
    render(<CopyButton text="ABCD1234" />);
    await userEvent.click(screen.getByRole('button'));
    expect(writeText).toHaveBeenCalledWith('ABCD1234');
  });

  it('title changes to "Copied!" after clicking to confirm the action', async () => {
    mockClipboard();
    render(<CopyButton text="hello" />);
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByTitle('Copied!')).toBeInTheDocument());
  });
});
