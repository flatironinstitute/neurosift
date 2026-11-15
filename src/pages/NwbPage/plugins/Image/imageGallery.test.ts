import { describe, expect, it } from "vitest";
import { galleryImages } from "./imageGallery";

const ds = (name: string, shape: number[]) => ({ name, shape });

describe("galleryImages", () => {
  it("keeps 2D and 3D image datasets and leaves out lists such as order_of_images", () => {
    const { images } = galleryImages([
      ds("image_1", [400, 300, 3]),
      ds("order_of_images", [281]),
      ds("gray", [64, 32]),
    ]);
    expect(images.map((d) => d.name)).toEqual(["image_1", "gray"]);
  });

  it("measures colour images by height and width, not channels", () => {
    expect(
      galleryImages([ds("a", [400, 300, 3]), ds("b", [200, 500, 4])]),
    ).toMatchObject({ width: 500, height: 400 });
  });

  it("is 0 × 0 with no images", () => {
    expect(galleryImages([ds("order_of_images", [281])])).toMatchObject({
      images: [],
      width: 0,
      height: 0,
    });
  });
});
