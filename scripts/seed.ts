import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { faker } from "@faker-js/faker";
import { db } from "@/db";
import {
  collections,
  subcollections,
  subcategories,
  products,
  categories,
} from "@/db/schema";

function generateImageUrl(type: "product" | "category" | "subcategory"): string {
  const width = 400;
  const height = 400;
  const imageStyles = [
    `https://placehold.co/${width}x${height}/png?text=Product`,
    `https://placehold.co/${width}x${height}/png?text=Item`,
    `https://placehold.co/${width}x${height}/jpeg?text=Product+Image`,
    `https://placehold.co/${width}x${height}/png?text=Category`,
    `https://placehold.co/${width}x${height}/png?text=Department`,
    `https://placehold.co/${width}x${height}/${faker.color.rgb().slice(1)}/${faker.color.rgb().slice(1)}`,
  ];

  const imagePool = type === "product" 
    ? [imageStyles[0], imageStyles[2], imageStyles[5]]
    : [imageStyles[3], imageStyles[4], imageStyles[5]];

  return imagePool[Math.floor(Math.random() * imagePool.length)];
}

async function seed() {
  console.log("Seeding started...");

  // Clear existing data
  console.log("Clearing existing data...");
  await db.delete(products);
  await db.delete(subcategories);
  await db.delete(subcollections);
  await db.delete(categories);
  await db.delete(collections);
  console.log("Existing data cleared.");

  const totalCollections = 20;
  const totalCategoriesPerCollection = 5;
  const totalSubcollectionsPerCategory = 2;
  const totalSubcategoriesPerSubcollection = 2;
  const totalProductsPerSubcategory = 10;

  const totalEntries =
    totalCollections +
    totalCollections * totalCategoriesPerCollection +
    totalCollections * totalCategoriesPerCollection * totalSubcollectionsPerCategory +
    totalCollections * totalCategoriesPerCollection * totalSubcollectionsPerCategory * totalSubcategoriesPerSubcollection +
    totalCollections * totalCategoriesPerCollection * totalSubcollectionsPerCategory * totalSubcategoriesPerSubcollection * totalProductsPerSubcategory;

  console.log(`Estimated total entries: ${totalEntries}`);

  // Seed Collections
  const usedCollectionSlugs = new Set();
  const collectionsData = Array.from({ length: totalCollections }, () => {
    let name, slug;
    do {
      name = `${faker.commerce.department()} ${faker.string.nanoid(4)}`;
      slug = faker.helpers.slugify(name.toLowerCase());
    } while (usedCollectionSlugs.has(slug));
    usedCollectionSlugs.add(slug);
    return { name, slug };
  });

  const insertedCollections = await db.insert(collections).values(collectionsData).returning();
  console.log(`${insertedCollections.length} collections added.`);

  // Seed Categories
  const usedCategorySlugs = new Set();
  const categoriesData = [];
  
  for (const collection of insertedCollections) {
    for (let i = 0; i < totalCategoriesPerCollection; i++) {
      let name, slug;
      do {
        name = `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${faker.string.nanoid(4)}`;
        slug = faker.helpers.slugify(name.toLowerCase());
      } while (usedCategorySlugs.has(slug));
      
      usedCategorySlugs.add(slug);
      categoriesData.push({
        name,
        slug,
        collection_id: collection.id,
        image_url: generateImageUrl("category"),
      });
    }
  }

  const insertedCategories = await db.insert(categories).values(categoriesData).returning();
  console.log(`${insertedCategories.length} categories added.`);

  // Seed Subcollections
  const subcollectionsData = [];
  for (const category of insertedCategories) {
    for (let i = 0; i < totalSubcollectionsPerCategory; i++) {
      const name = `${faker.commerce.productName()} ${faker.string.nanoid(4)}`;
      subcollectionsData.push({
        name,
        category_slug: category.slug,
      });
    }
  }

  const insertedSubcollections = await db.insert(subcollections).values(subcollectionsData).returning();
  console.log(`${insertedSubcollections.length} subcollections added.`);

  // Seed Subcategories
  const usedSubcategorySlugs = new Set();
  const subcategoriesData = [];

  for (const subcollection of insertedSubcollections) {
    for (let i = 0; i < totalSubcategoriesPerSubcollection; i++) {
      let name, slug;
      do {
        name = `${faker.commerce.productMaterial()} ${faker.commerce.productAdjective()} ${faker.string.nanoid(4)}`;
        slug = faker.helpers.slugify(name.toLowerCase());
      } while (usedSubcategorySlugs.has(slug));

      usedSubcategorySlugs.add(slug);
      subcategoriesData.push({
        name,
        slug,
        subcollection_id: subcollection.id,
        image_url: generateImageUrl("subcategory"),
      });
    }
  }

  const insertedSubcategories = await db.insert(subcategories).values(subcategoriesData).returning();
  console.log(`${insertedSubcategories.length} subcategories added.`);

  // Seed Products
  const usedProductSlugs = new Set();
  const productsData = [];

  for (const subcategory of insertedSubcategories) {
    for (let i = 0; i < totalProductsPerSubcategory; i++) {
      let name, slug;
      do {
        name = `${faker.commerce.productName()} ${faker.string.nanoid(6)}`;
        slug = faker.helpers.slugify(name.toLowerCase());
      } while (usedProductSlugs.has(slug));

      usedProductSlugs.add(slug);
      productsData.push({
        name,
        slug,
        description: faker.commerce.productDescription(),
        price: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }).toFixed(2),
        subcategory_slug: subcategory.slug,
        image_url: generateImageUrl("product"),
      });
    }
  }

  const insertedProducts = await db.insert(products).values(productsData).returning();
  console.log(`${insertedProducts.length} products added.`);

  console.log("\nSeeding Summary:");
  console.log("----------------");
  console.log(`Collections:    ${insertedCollections.length}`);
  console.log(`Categories:     ${insertedCategories.length}`);
  console.log(`Subcollections: ${insertedSubcollections.length}`);
  console.log(`Subcategories:  ${insertedSubcategories.length}`);
  console.log(`Products:       ${insertedProducts.length}`);
  console.log(`Total Entries:  ${totalEntries}`);
  console.log("\nSeeding completed successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });