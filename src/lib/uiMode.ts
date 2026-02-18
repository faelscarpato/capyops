export function isV3Enabled(search: string = location.search) {
  return new URLSearchParams(search).get('ui') === 'v3';
}
