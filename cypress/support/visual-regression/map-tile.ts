import { Buffer } from 'buffer';

type MapTileResponse = {
  readonly body: Uint8Array;
  readonly headers: Record<string, string>;
};

const MAP_TILE_CONTENT_TYPE = 'image/png' as const;
const MAP_TILE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2GdN0AAAAASUVORK5CYII=' as const;

const mapTileBody = Buffer.from(MAP_TILE_BASE64, 'base64');
const mapTileHeaders: Record<string, string> = { 'content-type': MAP_TILE_CONTENT_TYPE };

export const buildMapTileResponse = (): MapTileResponse => ({
  body: mapTileBody,
  headers: mapTileHeaders
});
