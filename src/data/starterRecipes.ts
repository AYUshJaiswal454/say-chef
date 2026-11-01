import type { RecipeInput } from '../lib/data/types';

/**
 * Recipes Say Chef ships with. Demo mode loads them automatically, and in Firebase mode
 * the first signed-in cook can add them with one click. Contributions welcome: keep steps
 * written the way you'd say them, and include times ("simmer for 10 minutes") so they
 * become timers.
 */
export interface StarterRecipe extends RecipeInput {
  /** Stable id used in demo mode, so links keep working between visits. */
  id: string;
}

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    "id": "dal-tadka",
    "title": "Dal Tadka",
    "description": "Everyday yellow lentils finished with a sizzling ghee tempering of cumin, garlic and chilli. Comforting, cheap and ready in under an hour.",
    "cuisine": "Indian",
    "difficulty": "Easy",
    "prepMinutes": 10,
    "cookMinutes": 35,
    "servings": 4,
    "diet": [
      "Vegetarian",
      "Gluten-free"
    ],
    "ingredients": [
      "1 cup toor dal (split pigeon peas), rinsed",
      "3 cups water",
      "1/2 tsp turmeric",
      "1 tsp salt",
      "2 tbsp ghee or oil",
      "1 tsp cumin seeds",
      "1 onion, finely chopped",
      "2 tomatoes, chopped",
      "4 garlic cloves, minced",
      "1 inch ginger, grated",
      "2 green chillies, slit",
      "1 tsp Kashmiri chilli powder",
      "2 tbsp fresh coriander, chopped"
    ],
    "steps": [
      "Rinse the dal three times, then add it to a pressure cooker with the water, turmeric and salt.",
      "Pressure cook for 12 minutes (about 4 whistles), then let the pressure release on its own for 10 minutes.",
      "Heat the ghee in a pan and add the cumin seeds. Let them sizzle for 30 seconds.",
      "Add the onion and sauté for 6 minutes until golden.",
      "Stir in the garlic, ginger and green chillies and cook for 1 minute.",
      "Add the tomatoes and chilli powder and cook for 5 minutes until soft and jammy.",
      "Whisk the cooked dal smooth, pour it into the pan and simmer for 5 minutes. Add a splash of water if it's too thick.",
      "Finish with the coriander and serve with rice or roti."
    ],
    "notes": "Use oil instead of ghee to make it vegan. No pressure cooker? Simmer the dal covered for about 35 minutes until it falls apart.",
    "plate": "curry"
  },
  {
    "id": "paneer-butter-masala",
    "title": "Paneer Butter Masala",
    "description": "Soft paneer in a silky tomato, cashew and butter gravy, finished with crushed kasuri methi and a swirl of cream.",
    "cuisine": "Indian",
    "difficulty": "Medium",
    "prepMinutes": 15,
    "cookMinutes": 30,
    "servings": 4,
    "diet": [
      "Vegetarian",
      "Gluten-free"
    ],
    "ingredients": [
      "250 g paneer, cubed",
      "2 tbsp butter",
      "1 tbsp oil",
      "1 onion, roughly chopped",
      "4 tomatoes, roughly chopped",
      "12 cashews",
      "1 tbsp ginger-garlic paste",
      "1 tsp Kashmiri chilli powder",
      "1 tsp garam masala",
      "1 tsp kasuri methi (dried fenugreek leaves)",
      "1/4 cup fresh cream",
      "1 tsp sugar",
      "1 tsp salt",
      "1 cup water"
    ],
    "steps": [
      "Heat the oil and half the butter in a pan. Add the onion, tomatoes and cashews and cook for 8 minutes until the tomatoes break down.",
      "Let the mixture cool for 5 minutes, then blend it to a very smooth purée.",
      "Melt the remaining butter in the same pan. Add the ginger-garlic paste and cook for 1 minute.",
      "Pour in the purée with the chilli powder, salt and sugar. Simmer for 10 minutes, stirring often, until the butter separates at the edges.",
      "Add the water and garam masala and bring to a gentle boil.",
      "Add the paneer and simmer for 3 minutes.",
      "Crush the kasuri methi between your palms over the pan, stir in the cream and turn off the heat."
    ],
    "notes": "Soak the paneer cubes in hot salted water while the gravy cooks to keep them soft.",
    "plate": "tomato"
  },
  {
    "id": "masala-chai",
    "title": "Masala Chai",
    "description": "Strong Assam tea boiled with milk, ginger and whole spices, the way a roadside tea stall makes it.",
    "cuisine": "Indian",
    "difficulty": "Easy",
    "prepMinutes": 2,
    "cookMinutes": 8,
    "servings": 2,
    "diet": [
      "Vegetarian",
      "Gluten-free"
    ],
    "ingredients": [
      "1 1/2 cups water",
      "1 cup whole milk",
      "2 tsp loose black tea (Assam)",
      "2 tsp sugar",
      "4 green cardamom pods, crushed",
      "1 inch ginger, crushed",
      "2 cloves",
      "1 small cinnamon stick"
    ],
    "steps": [
      "Bring the water, ginger, cardamom, cloves and cinnamon to a boil.",
      "Simmer for 3 minutes so the spices infuse.",
      "Add the tea leaves and boil for 2 minutes.",
      "Pour in the milk and sugar and bring it back to a boil. Let it rise and fall twice, about 3 minutes.",
      "Strain into cups and serve hot."
    ],
    "notes": "",
    "plate": "chai"
  },
  {
    "id": "cacio-e-pepe",
    "title": "Cacio e Pepe",
    "description": "Roman pasta with just pecorino, black pepper and starchy pasta water, tossed into a glossy, clinging sauce.",
    "cuisine": "Italian",
    "difficulty": "Medium",
    "prepMinutes": 5,
    "cookMinutes": 15,
    "servings": 2,
    "diet": [
      "Vegetarian"
    ],
    "ingredients": [
      "200 g spaghetti or tonnarelli",
      "80 g Pecorino Romano, very finely grated",
      "20 g Parmigiano Reggiano, finely grated",
      "2 tsp black peppercorns",
      "1 tsp salt, for the pasta water"
    ],
    "steps": [
      "Bring a wide pot of water to a boil with less salt than usual, because the pecorino is salty.",
      "Toast the peppercorns in a dry pan for 2 minutes, then crush them coarsely.",
      "Cook the pasta for about 8 minutes, a little short of the packet time.",
      "Mix both cheeses with 4 tbsp of hot (not boiling) pasta water into a smooth paste.",
      "Move the pasta to the pepper pan with a splash of pasta water and toss over low heat for 1 minute.",
      "Take the pan off the heat. Add the cheese paste and toss hard for 30 seconds until glossy. Loosen with more water if needed."
    ],
    "notes": "If the sauce goes stringy, the pan was too hot. Add a splash of warm water and keep tossing off the heat.",
    "plate": "noodle"
  },
  {
    "id": "black-bean-tacos",
    "title": "Black Bean Tacos",
    "description": "Smoky mashed black beans in warm corn tortillas with avocado and a quick lime-pickled cabbage slaw.",
    "cuisine": "Mexican",
    "difficulty": "Easy",
    "prepMinutes": 15,
    "cookMinutes": 10,
    "servings": 4,
    "diet": [
      "Vegan",
      "Vegetarian",
      "Gluten-free",
      "Dairy-free"
    ],
    "ingredients": [
      "2 cans (400 g each) black beans, drained",
      "1 tbsp olive oil",
      "1 tsp ground cumin",
      "1 tsp smoked paprika",
      "1/2 tsp salt",
      "8 small corn tortillas",
      "1 avocado, sliced",
      "1/4 red cabbage, finely shredded",
      "1/2 red onion, finely diced",
      "1 lime, cut into wedges",
      "1 handful fresh coriander",
      "1/2 cup salsa"
    ],
    "steps": [
      "Toss the cabbage and red onion with the juice of half the lime and a pinch of salt. Set aside for 10 minutes to soften.",
      "Heat the oil in a pan, add the beans, cumin, paprika and salt, and cook for 5 minutes, mashing about half the beans.",
      "Warm the tortillas in a dry pan for 30 seconds per side.",
      "Fill each tortilla with beans, avocado, the quick-pickled slaw and salsa.",
      "Finish with coriander and a squeeze of lime."
    ],
    "notes": "",
    "plate": "greens"
  },
  {
    "id": "thai-green-curry",
    "title": "Thai Green Curry with Tofu",
    "description": "A fragrant coconut curry loaded with aubergine, green beans and crisp tofu, finished with Thai basil.",
    "cuisine": "Thai",
    "difficulty": "Medium",
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": 4,
    "diet": [
      "Vegan",
      "Vegetarian",
      "Dairy-free"
    ],
    "ingredients": [
      "2 tbsp green curry paste",
      "400 ml coconut milk",
      "1 tbsp coconut oil",
      "200 g firm tofu, cubed",
      "1 small aubergine, cubed",
      "1 red bell pepper, sliced",
      "100 g green beans, trimmed",
      "1 tbsp soy sauce",
      "1 tsp brown sugar",
      "1 handful Thai basil leaves",
      "1 lime"
    ],
    "steps": [
      "Heat the coconut oil in a wok and fry the curry paste for 1 minute until fragrant.",
      "Add half the coconut milk and cook for 3 minutes until the oil starts to split out.",
      "Add the aubergine and the rest of the coconut milk, then simmer for 8 minutes.",
      "Add the tofu, pepper and green beans and simmer for 5 minutes more.",
      "Season with the soy sauce, sugar and a squeeze of lime. Taste and adjust.",
      "Stir in the Thai basil and serve with jasmine rice."
    ],
    "notes": "Check the curry paste label: some contain shrimp paste.",
    "plate": "herb"
  },
  {
    "id": "chicken-teriyaki",
    "title": "Chicken Teriyaki",
    "description": "Crisp-skinned chicken thighs lacquered in a simple four-ingredient teriyaki glaze. Weeknight fast.",
    "cuisine": "Japanese",
    "difficulty": "Easy",
    "prepMinutes": 10,
    "cookMinutes": 15,
    "servings": 2,
    "diet": [
      "Dairy-free",
      "High-protein"
    ],
    "ingredients": [
      "2 chicken thighs, boneless with skin",
      "1/2 tsp salt",
      "1 tsp neutral oil",
      "3 tbsp soy sauce",
      "2 tbsp mirin",
      "1 tbsp sake",
      "1 tbsp sugar",
      "1 spring onion, thinly sliced",
      "1 tsp toasted sesame seeds"
    ],
    "steps": [
      "Pat the chicken dry and season it lightly with salt.",
      "Mix the soy sauce, mirin, sake and sugar in a small bowl.",
      "Heat the oil in a pan and cook the chicken skin-side down over medium heat for 7 minutes until deeply golden.",
      "Flip and cook for 4 minutes more.",
      "Wipe out the excess fat, pour in the sauce and simmer for 2 minutes, spooning it over the chicken until glossy.",
      "Slice and top with the spring onion and sesame seeds."
    ],
    "notes": "",
    "plate": "glaze"
  },
  {
    "id": "shakshuka",
    "title": "Shakshuka",
    "description": "Eggs gently poached in a spiced pepper and tomato sauce, topped with feta and parsley. Bring bread.",
    "cuisine": "Mediterranean",
    "difficulty": "Easy",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "servings": 3,
    "diet": [
      "Vegetarian",
      "Gluten-free"
    ],
    "ingredients": [
      "2 tbsp olive oil",
      "1 onion, sliced",
      "1 red bell pepper, sliced",
      "3 garlic cloves, sliced",
      "1 tsp ground cumin",
      "1 tsp sweet paprika",
      "1/2 tsp chilli flakes",
      "800 g canned chopped tomatoes",
      "1 tsp salt",
      "5 eggs",
      "50 g feta, crumbled",
      "1 handful parsley, chopped"
    ],
    "steps": [
      "Heat the oil in a wide pan and cook the onion and pepper for 8 minutes until soft.",
      "Add the garlic, cumin, paprika and chilli flakes and stir for 1 minute.",
      "Pour in the tomatoes with the salt and simmer for 10 minutes until thickened.",
      "Make 5 wells in the sauce and crack an egg into each.",
      "Cover and cook on low for 6 minutes, until the whites are set and the yolks are still runny.",
      "Scatter over the feta and parsley and serve with bread."
    ],
    "notes": "",
    "plate": "skillet"
  },
  {
    "id": "buttermilk-pancakes",
    "title": "Buttermilk Pancakes",
    "description": "Tall, fluffy diner-style pancakes. The short rest is what makes them rise.",
    "cuisine": "American",
    "difficulty": "Easy",
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 4,
    "diet": [
      "Vegetarian"
    ],
    "ingredients": [
      "2 cups all-purpose flour",
      "2 tbsp sugar",
      "2 tsp baking powder",
      "1/2 tsp baking soda",
      "1/2 tsp salt",
      "2 cups buttermilk",
      "2 eggs",
      "3 tbsp butter, melted",
      "1 tsp vanilla extract",
      "Maple syrup, to serve"
    ],
    "steps": [
      "Whisk the flour, sugar, baking powder, baking soda and salt in a large bowl.",
      "In another bowl, whisk the buttermilk, eggs, melted butter and vanilla.",
      "Pour the wet mix into the dry and fold until just combined. Lumps are fine.",
      "Rest the batter for 5 minutes while the pan heats.",
      "Cook 1/4 cup portions on a buttered medium-hot pan for 2 minutes, until bubbles form on top.",
      "Flip and cook for 1 minute more. Serve warm with maple syrup."
    ],
    "notes": "No buttermilk? Stir 2 tbsp lemon juice into 2 cups of milk and wait 5 minutes.",
    "plate": "stack"
  },
  {
    "id": "kimchi-fried-rice",
    "title": "Kimchi Fried Rice",
    "description": "Day-old rice fried hard with caramelised kimchi and gochujang, crowned with a runny fried egg.",
    "cuisine": "Korean",
    "difficulty": "Easy",
    "prepMinutes": 10,
    "cookMinutes": 10,
    "servings": 2,
    "diet": [
      "Dairy-free"
    ],
    "ingredients": [
      "2 cups cooked rice, day-old",
      "1 cup kimchi, chopped",
      "2 tbsp kimchi juice",
      "1 tbsp gochujang",
      "1 tbsp neutral oil",
      "1 tsp toasted sesame oil",
      "2 spring onions, sliced",
      "2 eggs",
      "1 tsp soy sauce",
      "1 sheet roasted seaweed, crumbled"
    ],
    "steps": [
      "Heat the oil in a wok over high heat. Fry the kimchi for 3 minutes until it starts to caramelise.",
      "Add the rice, kimchi juice, gochujang and soy sauce. Stir-fry for 4 minutes, pressing the rice against the pan.",
      "Stir in the sesame oil and most of the spring onions, then divide between bowls.",
      "Fry the eggs sunny side up for 3 minutes.",
      "Top each bowl with an egg, the rest of the spring onions and the seaweed."
    ],
    "notes": "",
    "plate": "kimchi"
  },
  {
    "id": "classic-hummus",
    "title": "Classic Hummus",
    "description": "Whipped tahini first, then chickpeas and ice-cold water. The order is the secret to really smooth hummus.",
    "cuisine": "Middle Eastern",
    "difficulty": "Easy",
    "prepMinutes": 10,
    "cookMinutes": 0,
    "servings": 6,
    "diet": [
      "Vegan",
      "Vegetarian",
      "Gluten-free",
      "Dairy-free"
    ],
    "ingredients": [
      "400 g can chickpeas, drained",
      "1/4 cup tahini",
      "1 lemon, juiced",
      "1 garlic clove",
      "1/2 tsp ground cumin",
      "1/2 tsp salt",
      "3 tbsp ice-cold water",
      "2 tbsp olive oil, to serve",
      "1 pinch paprika"
    ],
    "steps": [
      "Blend the tahini and lemon juice for 1 minute until whipped and pale.",
      "Add the garlic, cumin and salt and blend for 30 seconds.",
      "Add the chickpeas and blend for 2 minutes, scraping down the sides.",
      "With the motor running, drizzle in the ice-cold water until very smooth and creamy.",
      "Spread in a shallow bowl, drizzle with olive oil and dust with paprika."
    ],
    "notes": "",
    "plate": "chickpea"
  },
  {
    "id": "chocolate-mug-cake",
    "title": "Chocolate Mug Cake",
    "description": "A single-serving chocolate cake made in a mug in the microwave. Under five minutes from craving to spoon.",
    "cuisine": "American",
    "difficulty": "Easy",
    "prepMinutes": 3,
    "cookMinutes": 2,
    "servings": 1,
    "diet": [
      "Vegetarian"
    ],
    "ingredients": [
      "4 tbsp all-purpose flour",
      "2 tbsp cocoa powder",
      "3 tbsp sugar",
      "1/4 tsp baking powder",
      "1 pinch salt",
      "3 tbsp milk",
      "2 tbsp neutral oil",
      "1 tbsp chocolate chips"
    ],
    "steps": [
      "Mix the flour, cocoa, sugar, baking powder and salt in a large mug.",
      "Stir in the milk and oil until smooth, then fold in the chocolate chips.",
      "Microwave on high for 70 seconds. The top should look just set.",
      "Let it stand for 1 minute before eating, because it keeps cooking."
    ],
    "notes": "Microwaves vary. Start with 60 seconds if yours is powerful.",
    "plate": "cocoa"
  }
];
