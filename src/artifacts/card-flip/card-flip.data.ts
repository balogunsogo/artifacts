import { spatialServices, type SpatialService } from "@/artifacts/spatial-services/spatial-services.data";

export const initialCardFlipServices = spatialServices.slice(0, 3);

export function pickRandomCardFlipServices(count = 3): SpatialService[] {
  const pool = [...spatialServices];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, count);
}
