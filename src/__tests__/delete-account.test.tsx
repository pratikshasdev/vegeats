import { fireEvent, render, screen } from '@testing-library/react-native';

import DeleteAccountScreen from '@/app/delete-account';

const mockDeleteAccount = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'pat@example.com' }, deleteAccount: mockDeleteAccount }),
}));
jest.mock('@/api/profile', () => ({
  useContributions: () => ({
    data: {
      reviews: [{ id: 'r1' }, { id: 'r2' }],
      photos: [{ id: 'p1' }],
      restaurants: [{ id: 'x1' }],
      dishes: [{ id: 'd1' }, { id: 'd2' }],
    },
  }),
}));

beforeEach(() => {
  mockDeleteAccount.mockReset();
  mockDismissTo.mockReset();
});

describe('DeleteAccountScreen', () => {
  it('spells out what is deleted and what is kept', async () => {
    await render(<DeleteAccountScreen />);
    expect(screen.getByText('2 reviews and 1 photo')).toBeTruthy();
    expect(screen.getByText(/1 restaurant and 2 dishes you added/)).toBeTruthy();
    expect(screen.getByText(/pat@example.com/)).toBeTruthy();
  });

  it('does nothing until DELETE is typed', async () => {
    await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByTestId('confirm-delete-account'));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and shows the done state', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    await render(<DeleteAccountScreen />);
    await fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'delete');
    await fireEvent.press(screen.getByTestId('confirm-delete-account'));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Your account is deleted')).toBeTruthy();
    await fireEvent.press(screen.getByText('Done'));
    expect(mockDismissTo).toHaveBeenCalledWith('/profile');
  });

  it('shows the server error and keeps the account screen open', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('Unauthorized'));
    await render(<DeleteAccountScreen />);
    await fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'DELETE');
    await fireEvent.press(screen.getByTestId('confirm-delete-account'));
    expect(await screen.findByText('Unauthorized')).toBeTruthy();
    expect(screen.queryByText('Your account is deleted')).toBeNull();
  });
});
