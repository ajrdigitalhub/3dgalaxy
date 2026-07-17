import { describe, it, expect } from "vitest";
import { buildProductPayload } from "./productImport";

describe("buildProductPayload", () => {
  it("preserves variant image URLs from imported variant data", async () => {
    const tx = {} as any;
    const group = {
      name: "Test Product",
      slug: "test-product",
      key: "test-product",
      productCategory: "Filaments",
      vendor: "Acme",
      variants: [
        {
          name: "Blue",
          sku: "blue-sku",
          price: 100,
          stock: 10,
          optionValues: { Color: "Blue" },
          images: ["https://example.com/variant.png"],
        },
      ],
      images: ["https://example.com/main.png"],
      relatedProducts: [],
      extraAttributes: [],
      tags: [],
      specifications: [],
      published: true,
    };

    const payload = await buildProductPayload(group, tx, new Map(), new Map());

    expect(payload.variants[0].variantImages).toEqual([
      "https://example.com/variant.png",
    ]);
  });
});
