// One switch controls every AP Super store invitation. Web access stays free.
export const storeLinks: { apSuper: { enabled: boolean; playUrl: string | null; appStoreUrl: string | null } } = {
  apSuper: {
    enabled: true,
    // Google Play is not public yet; show only the verified App Store release.
    playUrl: null,
    appStoreUrl: "https://apps.apple.com/app/id6833285825",
  },
};
