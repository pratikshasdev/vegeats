import { parsePriceToCents } from './format';
import { TAG_BY_SLUG } from './tags';

export type Errors<T> = Partial<Record<keyof T, string>>;

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export function validateSignIn(v: { email: string; password: string }): Errors<typeof v> {
  const e: Errors<typeof v> = {};
  if (!isEmail(v.email)) e.email = 'Enter a valid email address.';
  if (!v.password) e.password = 'Enter your password.';
  return e;
}

export function validateSignUp(v: { name: string; email: string; password: string }): Errors<typeof v> {
  const e: Errors<typeof v> = {};
  if (!v.name.trim()) e.name = 'Enter the name other people will see on your reviews.';
  else if (v.name.trim().length > 60) e.name = 'Keep your name under 60 characters.';
  if (!isEmail(v.email)) e.email = 'Enter a valid email address.';
  if (v.password.length < 8) e.password = 'Use at least 8 characters.';
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) e.password = 'Include at least one letter and one number.';
  return e;
}

export interface DishFormValues {
  name: string;
  description: string;
  category: string;
  price: string;
  tags: string[];
}

export function validateDish(v: DishFormValues): Errors<DishFormValues> {
  const e: Errors<DishFormValues> = {};
  if (!v.name.trim()) e.name = 'Enter the dish name as it appears on the menu.';
  else if (v.name.trim().length > 120) e.name = 'Keep the name under 120 characters.';
  if (!v.category.trim()) e.category = 'Pick or type a menu section.';
  else if (v.category.trim().length > 60) e.category = 'Keep the section name under 60 characters.';
  if (Number.isNaN(parsePriceToCents(v.price))) e.price = 'Enter a price like 12.50, or leave it blank.';
  if (v.tags.length === 0) e.tags = 'Mark at least one tag, such as Vegan or Vegetarian.';
  else if (v.tags.some((t) => !TAG_BY_SLUG[t])) e.tags = 'One of the tags is not recognized.';
  return e;
}

export interface RestaurantFormValues {
  name: string;
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
  website: string;
  description: string;
}

export function validateRestaurant(v: RestaurantFormValues): Errors<RestaurantFormValues> {
  const e: Errors<RestaurantFormValues> = {};
  if (!v.name.trim()) e.name = 'Enter the restaurant name.';
  else if (v.name.trim().length > 120) e.name = 'Keep the name under 120 characters.';
  if (!v.addressLine.trim()) e.addressLine = 'Enter the street address.';
  if (!v.city.trim()) e.city = 'Enter the city.';
  if (!/^[A-Za-z]{2}$/.test(v.region.trim())) e.region = 'Use the 2-letter state code, like MI.';
  if (v.postalCode.trim() && !/^\d{5}(-\d{4})?$/.test(v.postalCode.trim())) e.postalCode = 'Enter a 5-digit ZIP code.';
  if (v.phone.trim() && v.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit phone number.';
  if (v.website.trim() && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(v.website.trim())) e.website = 'Enter a web address like example.com.';
  return e;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;
