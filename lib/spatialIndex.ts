import RBush from 'rbush';

interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
  data: any;
}

class SpatialIndex {
  private tree: RBush<SpatialItem>;

  constructor() {
    this.tree = new RBush<SpatialItem>();
  }

  bulkInsert(items: Array<{ id: string; lng: number; lat: number; data?: any }>) {
    const spatialItems: SpatialItem[] = items.map(item => ({
      minX: item.lng,
      minY: item.lat,
      maxX: item.lng,
      maxY: item.lat,
      id: item.id,
      data: item.data || {}
    }));
    this.tree.load(spatialItems);
  }

  findHotspotsInBBox(minX: number, minY: number, maxX: number, maxY: number): SpatialItem[] {
    return this.tree.search({ minX, minY, maxX, maxY });
  }

  findNearby(lng: number, lat: number, radiusDegrees: number = 0.01): SpatialItem[] {
    return this.tree.search({
      minX: lng - radiusDegrees,
      minY: lat - radiusDegrees,
      maxX: lng + radiusDegrees,
      maxY: lat + radiusDegrees
    });
  }

  clear() {
    this.tree.clear();
  }
}

export const spatialIndex = new SpatialIndex();
export { SpatialIndex };
export type { SpatialItem };
