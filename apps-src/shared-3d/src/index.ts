export * from "./model";
// `./glb` no se reexporta: `loadModel`/`parseModel` lo cargan bajo demanda (GLTFLoader pesa ~100 KB).
export * from "./load";
export * from "./build";
export * from "./vertex-emission";
export * from "./dispose";
export * from "./stats";
