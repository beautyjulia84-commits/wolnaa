export function normalizeAttribution(input: unknown) {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const clean = (key: string) => typeof data[key] === 'string' ? (data[key] as string).replace(/[\x00-\x1f]/g, '').trim().slice(0, 100) : '';
  return { source: clean('utm_source'), medium: clean('utm_medium'), campaign: clean('utm_campaign'), content: clean('utm_content') };
}

export function attributionMetadata(req: Request): Record<string, string> {
  const cookie = req.headers.get('cookie')?.split(';').find(value => value.trim().startsWith('wolnaa-campaign='));
  if (!cookie) return {};
  try {
    const data = JSON.parse(decodeURIComponent(cookie.trim().slice('wolnaa-campaign='.length)));
    const attribution = normalizeAttribution({utm_source:data.source,utm_medium:data.medium,utm_campaign:data.campaign,utm_content:data.content});
    if (!attribution.source) return {};
    return { acquisitionSource:attribution.source, acquisitionMedium:attribution.medium, acquisitionCampaign:attribution.campaign, acquisitionContent:attribution.content, attributionVersion:'1' };
  } catch { return {}; }
}
