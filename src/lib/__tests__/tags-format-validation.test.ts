import { lightColors } from '@/theme/tokens';

import { formatDistance, formatPrice, formatPriceLevel, formatRelativeDate, fullAddress, parsePriceToCents, pluralize } from '../format';
import { directionsUrl, normalizeWebsite, phoneUrl } from '../links';
import { dietLevelColors, missingTags, satisfies, TAG_BY_SLUG, tagColors, tagLabel, TAGS } from '../tags';
import { validateDish, validateRestaurant, validateSignIn, validateSignUp } from '../validation';

describe('tags', () => {
  it('has unique slugs matching the database format', () => {
    const slugs = TAGS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9_]+$/));
    expect(TAGS).toHaveLength(19);
  });

  it('treats vegan as satisfying vegetarian and dairy-free', () => {
    expect(satisfies(['vegan'], ['vegetarian'])).toBe(true);
    expect(satisfies(['vegan'], ['dairy_free', 'lacto_ovo'])).toBe(true);
    expect(satisfies(['vegan'], ['gluten_free'])).toBe(false);
    expect(satisfies(['vegetarian'], ['vegan'])).toBe(false);
    expect(satisfies(['vegan', 'gluten_free', 'jain'], ['jain', 'gluten_free'])).toBe(true);
    expect(satisfies([], [])).toBe(true);
  });

  it('lists what is missing', () => {
    expect(missingTags(['vegan'], ['vegetarian', 'nut_free'])).toEqual(['nut_free']);
  });

  it('labels and colors tags by category', () => {
    expect(tagLabel('gluten_free')).toBe('Gluten-free');
    expect(tagLabel('mystery_tag')).toBe('mystery tag');
    expect(tagColors('vegan', lightColors).fg).toBe(lightColors.vegan);
    expect(tagColors('nut_free', lightColors).fg).toBe(lightColors.allergen);
    expect(tagColors('jain', lightColors).fg).toBe(lightColors.religious);
    expect(tagColors('high_protein', lightColors).fg).toBe(lightColors.health);
    expect(dietLevelColors('vegetarian', lightColors).bg).toBe(lightColors.vegetarianTint);
    expect(TAG_BY_SLUG.sattvic.category).toBe('religious');
  });
});

describe('format', () => {
  it('formats distances in US units', () => {
    expect(formatDistance(100)).toBe('350 ft');
    expect(formatDistance(1609.344 * 2.34)).toBe('2.3 mi');
    expect(formatDistance(1609.344 * 25.6)).toBe('26 mi');
    expect(formatDistance(null)).toBe('');
  });

  it('formats prices', () => {
    expect(formatPriceLevel(2)).toBe('$$');
    expect(formatPriceLevel(0)).toBe('');
    expect(formatPrice(1250)).toBe('$12.50');
    expect(formatPrice(null)).toBe('');
  });

  it('parses prices', () => {
    expect(parsePriceToCents('12.5')).toBe(1250);
    expect(parsePriceToCents('$1,200')).toBe(120000);
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('abc')).toBeNaN();
    expect(parsePriceToCents('1.234')).toBeNaN();
  });

  it('formats relative dates and plurals', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    expect(formatRelativeDate('2026-10-27T08:00:00Z', now)).toBe('Today');
    expect(formatRelativeDate('2026-10-26T08:00:00Z', now)).toBe('Yesterday');
    expect(formatRelativeDate('2026-10-13T08:00:00Z', now)).toBe('2 weeks ago');
    expect(pluralize(1, 'dish', 'dishes')).toBe('1 dish');
    expect(pluralize(3, 'place')).toBe('3 places');
  });

  it('builds a full address', () => {
    expect(fullAddress({ address_line: '1 Main St', city: 'Ann Arbor', region: 'MI', postal_code: '48104' })).toBe(
      '1 Main St, Ann Arbor, MI 48104',
    );
  });
});

describe('links', () => {
  it('builds platform directions', () => {
    expect(directionsUrl(42.28, -83.74, 'Seva & Co', 'ios')).toBe('https://maps.apple.com/?daddr=42.28,-83.74&q=Seva%20%26%20Co');
    expect(directionsUrl(42.28, -83.74, 'X', 'android')).toContain('google.com/maps/dir/?api=1&destination=42.28,-83.74');
  });
  it('normalizes phone and website', () => {
    expect(phoneUrl('(734) 555-0100')).toBe('tel:7345550100');
    expect(normalizeWebsite('example.com')).toBe('https://example.com');
    expect(normalizeWebsite('http://a.b')).toBe('http://a.b');
  });
});

describe('validation', () => {
  it('validates sign in and sign up', () => {
    expect(validateSignIn({ email: 'bad', password: '' })).toEqual({
      email: 'Enter a valid email address.',
      password: 'Enter your password.',
    });
    expect(validateSignUp({ name: 'Dev', email: 'dev@example.com', password: 'password1' })).toEqual({});
    expect(validateSignUp({ name: '', email: 'dev@example.com', password: 'short' }).password).toBe('Use at least 8 characters.');
    expect(validateSignUp({ name: 'Dev', email: 'dev@example.com', password: 'longpassword' }).password).toMatch(/letter and one number/);
  });

  it('validates dishes', () => {
    expect(validateDish({ name: 'Dal', description: '', category: 'Mains', price: '9.50', tags: ['vegan'] })).toEqual({});
    const e = validateDish({ name: ' ', description: '', category: '', price: 'ten', tags: [] });
    expect(Object.keys(e).sort()).toEqual(['category', 'name', 'price', 'tags']);
    expect(validateDish({ name: 'Dal', description: '', category: 'Mains', price: '', tags: ['made_up'] }).tags).toBeDefined();
  });

  it('validates restaurants', () => {
    const ok = {
      name: 'Seva',
      addressLine: '314 E Liberty St',
      city: 'Ann Arbor',
      region: 'MI',
      postalCode: '48104',
      phone: '',
      website: 'seva.com',
      description: '',
    };
    expect(validateRestaurant(ok)).toEqual({});
    expect(validateRestaurant({ ...ok, region: 'Michigan', postalCode: '481', phone: '123', website: 'not a site' })).toEqual({
      region: 'Use the 2-letter state code, like MI.',
      postalCode: 'Enter a 5-digit ZIP code.',
      phone: 'Enter a 10-digit phone number.',
      website: 'Enter a web address like example.com.',
    });
  });
});
