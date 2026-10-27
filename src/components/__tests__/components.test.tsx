import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Dish } from '@/api/menu';
import type { RestaurantSummary } from '@/api/restaurants';

import { DishRow } from '../dish-row';
import { RestaurantCard, ratingSummary } from '../restaurant-card';
import { Chip } from '../ui/chip';
import { DietSticker } from '../ui/diet-sticker';
import { StarInput } from '../ui/stars';

jest.mock('expo-router', () => {
  return {
    Link: ({ children }: { children: React.ReactElement }) => children,
    router: { push: jest.fn() },
  };
});
jest.mock('expo-image', () => ({ Image: () => null }));

const dish = (over: Partial<Dish> = {}): Dish => ({
  id: 'd1',
  name: 'Chana masala',
  category: 'Mains',
  sort_order: 0,
  created_at: '',
  created_by: null,
  description: 'Chickpeas in tomato gravy',
  photo_url: null,
  price_cents: 1450,
  restaurant_id: 'r1',
  status: 'approved',
  tags: ['vegan', 'gluten_free'],
  updated_at: '',
  ...over,
});

describe('DishRow', () => {
  it('marks dishes that fit the diet', async () => {
    await render(<DishRow dish={dish()} wanted={['vegetarian', 'gluten_free']} />);
    expect(screen.getByText('Fits your diet')).toBeTruthy();
    expect(screen.getByText('$14.50')).toBeTruthy();
    expect(screen.getByText('Gluten-free')).toBeTruthy();
  });

  it('does not mark dishes missing a requirement', async () => {
    await render(<DishRow dish={dish()} wanted={['nut_free']} />);
    expect(screen.queryByText('Fits your diet')).toBeNull();
    expect(screen.getByLabelText(/Not marked Nut-free/)).toBeTruthy();
  });

  it('shows pending state', async () => {
    await render(<DishRow dish={dish({ status: 'pending' })} wanted={[]} />);
    expect(screen.getByText('Pending review')).toBeTruthy();
  });
});

describe('RestaurantCard', () => {
  const r: RestaurantSummary = {
    id: 'r1',
    name: 'Green Leaf',
    address_line: '1 Main',
    city: 'Ann Arbor',
    cover_photo_url: '',
    cuisines: ['Thai'],
    description: '',
    diet_level: 'fully_vegan',
    distance_m: 1609.344 * 1.2,
    external_rating: 4.5,
    external_rating_count: 120,
    hours: null as never,
    lat: 0,
    lng: 0,
    postal_code: '',
    price_level: 2,
    rating_avg: 0,
    rating_count: 0,
    region: 'MI',
    tags: ['vegan', 'gluten_free', 'nut_free', 'jain', 'oil_free'],
    timezone: 'America/Detroit',
  };

  it('renders the key facts', async () => {
    await render(<RestaurantCard restaurant={r} highlightTags={['jain']} />);
    expect(screen.getByText('Green Leaf')).toBeTruthy();
    expect(screen.getByText('Thai, $$, 1.2 mi')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('Hours not listed')).toBeTruthy();
    expect(screen.getByLabelText('100% vegan')).toBeTruthy();
    // The user's own tag comes first; extra tags collapse.
    expect(screen.getByText('Jain')).toBeTruthy();
    expect(screen.getByText('+2 more')).toBeTruthy();
  });

  it('prefers VegEats ratings over web ratings', async () => {
    expect(ratingSummary({ ...r, rating_avg: 4.9, rating_count: 3 })).toEqual({ value: 4.9, count: 3, source: 'VegEats' });
    expect(ratingSummary(r)).toEqual({ value: 4.5, count: 120, source: 'web' });
    expect(ratingSummary({ ...r, external_rating: null })).toBeNull();
  });
});

describe('UI primitives', () => {
  it('Chip reports selection to assistive tech and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Vegan" selected onPress={onPress} badge={2} />);
    const chip = screen.getByRole('button', { name: 'Vegan, 2 active' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('StarInput sets a rating', async () => {
    const onChange = jest.fn();
    await render(<StarInput value={0} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('DietSticker labels each level', async () => {
    await render(<DietSticker level="vegetarian" />);
    expect(screen.getByLabelText('Vegetarian')).toBeTruthy();
    expect(screen.getByText('veggie')).toBeTruthy();
  });
});
