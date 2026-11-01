import type { Diet, Difficulty } from '../../data/cuisines';
import type { PlateKey } from '../plateArt';

/** What a cook fills in on the recipe form. */
export interface RecipeInput {
  title: string;
  description: string;
  cuisine: string;
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  diet: Diet[];
  /** One ingredient per line, amount first: "1 cup basmati rice, rinsed". */
  ingredients: string[];
  /** One step per line, written the way you'd say it. */
  steps: string[];
  notes: string;
  /** Plate illustration; empty means "use the cuisine's default". */
  plate: PlateKey | '';
}

export interface Recipe extends RecipeInput {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  /** Milliseconds since the epoch. */
  createdAt: number;
  updatedAt: number;
  ratingCount: number;
  ratingSum: number;
  /** One of the recipes Say Chef ships with. */
  starter: boolean;
}

export interface Review {
  /** Reviews are keyed by author, so each cook has at most one per recipe. */
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewInput {
  rating: number;
  text: string;
}

export interface CookUser {
  uid: string;
  name: string;
  photoURL: string | null;
}

export type Unsubscribe = () => void;

/**
 * Everything the UI needs from storage. Two implementations exist:
 * - `firestoreSource` shares recipes through Firebase Auth + Cloud Firestore.
 * - `localSource` keeps everything in the browser so the app runs with no setup.
 */
export interface DataSource {
  readonly mode: 'firebase' | 'demo';

  onAuthChange(next: (user: CookUser | null) => void): Unsubscribe;
  signIn(): Promise<void>;
  signOut(): Promise<void>;

  watchRecipes(next: (recipes: Recipe[]) => void, error: (e: unknown) => void): Unsubscribe;
  createRecipe(user: CookUser, input: RecipeInput, options?: { starter?: boolean }): Promise<string>;
  createRecipes(user: CookUser, inputs: RecipeInput[], options?: { starter?: boolean }): Promise<void>;
  updateRecipe(user: CookUser, id: string, input: RecipeInput): Promise<void>;
  deleteRecipe(id: string): Promise<void>;

  watchReviews(recipeId: string, next: (reviews: Review[]) => void, error: (e: unknown) => void): Unsubscribe;
  saveReview(user: CookUser, recipeId: string, review: ReviewInput): Promise<void>;
  deleteReview(user: CookUser, recipeId: string): Promise<void>;

  watchFavorites(uid: string, next: (ids: string[]) => void): Unsubscribe;
  setFavorite(uid: string, recipeId: string, saved: boolean): Promise<void>;
}

export function averageRating(recipe: Pick<Recipe, 'ratingCount' | 'ratingSum'>): number {
  return recipe.ratingCount > 0 ? recipe.ratingSum / recipe.ratingCount : 0;
}

export function totalMinutes(recipe: Pick<RecipeInput, 'prepMinutes' | 'cookMinutes'>): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}
