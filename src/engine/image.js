export class VietGameImage {
  constructor(options = {}) {
    this.imageFactory =
      options.imageFactory ||
      (() => {
        if (typeof Image === "undefined") {
          throw new Error("Moi truong khong ho tro Image");
        }
        return new Image();
      });

    this.images = new Map();
    this.cache = new Map();
  }

  dangKyHinhAnh(name, src) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Ten hinh anh khong hop le");
    }

    if (typeof src !== "string" || !src.trim()) {
      throw new Error("Duong dan hinh anh khong hop le");
    }

    const cached = this.cache.get(src);

    if (cached) {
      this.images.set(name, cached);
      return name;
    }

    const image = this.imageFactory();

    const asset = {
      image,
      src,
      loaded: false,
      failed: false
    };

    this.images.set(name, asset);
    this.cache.set(src, asset);

    image.onload = () => {
      asset.loaded = true;
      asset.failed = false;
    };

    image.onerror = () => {
      asset.loaded = false;
      asset.failed = true;
    };

    image.src = src;

    return name;
  }

  hinhAnhDaTai(name) {
    const asset = this.images.get(name);
    return Boolean(asset && asset.loaded && !asset.failed);
  }

  veHinhAnh(ctx, name, x, y) {
    const asset = this.images.get(name);

    if (!asset || !asset.loaded || asset.failed) {
      return false;
    }

    ctx.drawImage(asset.image, x, y);
    return true;
  }

  veHinhAnhCoKichThuoc(ctx, name, x, y, width, height) {
    const asset = this.images.get(name);

    if (!asset || !asset.loaded || asset.failed) {
      return false;
    }

    ctx.drawImage(asset.image, x, y, width, height);
    return true;
  }

  destroy() {
    for (const asset of this.cache.values()) {
      asset.image.onload = null;
      asset.image.onerror = null;

      try {
        asset.image.src = "";
      } catch {
        // Bo qua loi khi giai phong tai nguyen.
      }
    }

    this.images.clear();
    this.cache.clear();
  }
}
