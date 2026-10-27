import type { Enums } from './database.types';
import type { ThemeColors } from '@/theme/tokens';

export type TagCategory = Enums<'tag_category'>;
export type DietLevel = Enums<'diet_level'>;

export interface TagDef {
  slug: string;
  label: string;
  category: TagCategory;
  description: string;
}

// Mirrors public.tags (the database rejects unknown slugs).
export const TAGS: TagDef[] = [
  { slug: 'vegan', label: 'Vegan', category: 'diet', description: 'No animal products of any kind' },
  { slug: 'vegetarian', label: 'Vegetarian', category: 'diet', description: 'No meat, poultry or fish' },
  { slug: 'lacto_vegetarian', label: 'Lacto-vegetarian', category: 'diet', description: 'Vegetarian with dairy, no eggs' },
  { slug: 'ovo_vegetarian', label: 'Ovo-vegetarian', category: 'diet', description: 'Vegetarian with eggs, no dairy' },
  { slug: 'lacto_ovo', label: 'Lacto-ovo', category: 'diet', description: 'Vegetarian with dairy and eggs' },
  { slug: 'gluten_free', label: 'Gluten-free', category: 'allergen', description: 'No wheat, barley, rye or cross-contact' },
  { slug: 'nut_free', label: 'Nut-free', category: 'allergen', description: 'No peanuts or tree nuts' },
  { slug: 'soy_free', label: 'Soy-free', category: 'allergen', description: 'No soy' },
  { slug: 'dairy_free', label: 'Dairy-free', category: 'allergen', description: 'No milk or milk derivatives' },
  { slug: 'oil_free', label: 'Oil-free', category: 'health', description: 'Prepared without added oil' },
  { slug: 'wfpb', label: 'Whole-food plant-based', category: 'health', description: 'Minimally processed plant foods' },
  { slug: 'low_sodium', label: 'Low-sodium', category: 'health', description: 'Reduced salt' },
  { slug: 'high_protein', label: 'High-protein', category: 'health', description: 'Protein-rich dish' },
  { slug: 'b12_source', label: 'B12 source', category: 'health', description: 'Fortified or natural B12 source' },
  { slug: 'iron_rich', label: 'Iron-rich', category: 'health', description: 'Good plant source of iron' },
  { slug: 'jain', label: 'Jain', category: 'religious', description: 'No root vegetables, eggs, honey or meat' },
  { slug: 'sattvic', label: 'Sattvic (no onion/garlic)', category: 'religious', description: 'No onion, garlic or meat' },
  { slug: 'halal_veg', label: 'Halal vegetarian', category: 'religious', description: 'Vegetarian, halal-compliant ingredients' },
  { slug: 'kosher_veg', label: 'Kosher vegetarian', category: 'religious', description: 'Vegetarian, kosher-certified' },
];

export const TAG_BY_SLUG: Record<string, TagDef> = Object.fromEntries(TAGS.map((t) => [t.slug, t]));

export const CATEGORY_LABELS: Record<TagCategory, string> = {
  diet: 'Diet',
  allergen: 'Allergen-free',
  health: 'Health-focused',
  religious: 'Religious & cultural',
};

export const CATEGORY_ORDER: TagCategory[] = ['diet', 'allergen', 'religious', 'health'];

export function tagsByCategory(category: TagCategory): TagDef[] {
  return TAGS.filter((t) => t.category === category);
}

export function tagLabel(slug: string): string {
  return TAG_BY_SLUG[slug]?.label ?? slug.replace(/_/g, ' ');
}

export const DIET_LEVELS: { value: DietLevel; label: string; short: string; description: string }[] = [
  { value: 'fully_vegan', label: '100% vegan', short: 'Vegan', description: 'The whole menu is plant-based' },
  { value: 'vegetarian', label: 'Vegetarian', short: 'Veg', description: 'No meat or fish on the menu' },
  { value: 'veg_friendly', label: 'Veg-friendly', short: 'Options', description: 'Has clearly marked veg or vegan dishes' },
];

export const DIET_LEVEL_BY_VALUE = Object.fromEntries(DIET_LEVELS.map((d) => [d.value, d])) as Record<
  DietLevel,
  (typeof DIET_LEVELS)[number]
>;

export function dietLevelColors(level: DietLevel, c: ThemeColors): { fg: string; bg: string } {
  switch (level) {
    case 'fully_vegan':
      return { fg: c.vegan, bg: c.veganTint };
    case 'vegetarian':
      return { fg: c.vegetarian, bg: c.vegetarianTint };
    default:
      return { fg: c.vegFriendly, bg: c.vegFriendlyTint };
  }
}

export function tagColors(slug: string, c: ThemeColors): { fg: string; bg: string } {
  const cat = TAG_BY_SLUG[slug]?.category;
  if (slug === 'vegan') return { fg: c.vegan, bg: c.veganTint };
  switch (cat) {
    case 'diet':
      return { fg: c.vegetarian, bg: c.vegetarianTint };
    case 'allergen':
      return { fg: c.allergen, bg: c.allergenTint };
    case 'health':
      return { fg: c.health, bg: c.healthTint };
    case 'religious':
      return { fg: c.religious, bg: c.religiousTint };
    default:
      return { fg: c.textMuted, bg: c.border };
  }
}

/**
 * Does an item with `itemTags` satisfy every requirement in `wanted`?
 * Vegan implies vegetarian (and its sub-types) and dairy-free.
 */
export function satisfies(itemTags: string[], wanted: string[]): boolean {
  const have = new Set(itemTags);
  if (have.has('vegan')) {
    ['vegetarian', 'lacto_vegetarian', 'ovo_vegetarian', 'lacto_ovo', 'dairy_free'].forEach((t) => have.add(t));
  }
  if (have.has('vegetarian') || have.has('lacto_ovo')) {
    ['vegetarian', 'lacto_ovo'].forEach((t) => have.add(t));
  }
  return wanted.every((w) => have.has(w));
}

/** Tags the item is missing from the user's requirements (after implications). */
export function missingTags(itemTags: string[], wanted: string[]): string[] {
  return wanted.filter((w) => !satisfies(itemTags, [w]));
}
