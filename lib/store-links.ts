// One switch controls every AP Super store invitation. Web access stays free.
export const storeLinks: {
  apSuper: {
    enabled: boolean;
    playUrl: string | null;
    appStoreUrl: string | null;
    appStoreUrls: { es: string; en: string };
  };
} = {
  apSuper: {
    enabled: true,
    // Google Play is not public yet; show only the verified App Store release.
    playUrl: null,
    appStoreUrl: "https://apps.apple.com/app/id6833285825",
    appStoreUrls: {
      es: "https://apps.apple.com/mx/app/ap-super-o%C3%ADdo-absoluto/id6833285825",
      en: "https://apps.apple.com/us/app/ap-super-perfect-pitch/id6833285825",
    },
  },
};
