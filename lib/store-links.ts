// One switch controls every AP Super store invitation. Web access stays free.
export const storeLinks: { apSuper: { enabled: boolean; playUrl: string | null; appStoreUrl: string | null } } = {
  apSuper: {
    enabled: false,
    playUrl: "https://play.google.com/store/apps/details?id=mx.com.stormstudios.apsuper",
    appStoreUrl: null,
  },
};
