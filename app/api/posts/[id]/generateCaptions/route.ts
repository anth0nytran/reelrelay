import { type NextRequest } from 'next/server';
import { createRouteClient, jsonWithCookies } from '@/lib/supabase/route';
import { IMPLEMENTED_PLATFORM_IDS, platformRegistry } from '@/lib/platform/registry';
import type { CaptionOutput } from '@/lib/captions/generator';
import type { PlatformId } from '@/lib/database.types';
import OpenAI from 'openai';
import { z } from 'zod';

export const runtime = 'nodejs';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Flag to use mock captions instead of calling OpenAI (saves credits during dev)
const USE_MOCK_CAPTIONS = process.env.USE_MOCK_CAPTIONS === 'true';

const GenerateCaptionsSchema = z.object({
  platforms: z.array(z.enum(['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'])).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, response } = createRouteClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body for platforms
  let selectedPlatforms: PlatformId[] = IMPLEMENTED_PLATFORM_IDS;
  try {
    const body = await request.json();
    const parsed = GenerateCaptionsSchema.safeParse(body);
    if (parsed.success && parsed.data.platforms && parsed.data.platforms.length > 0) {
      // Only use implemented platforms
      selectedPlatforms = parsed.data.platforms.filter(
        (p) => platformRegistry[p]?.implemented
      ) as PlatformId[];
    }
  } catch {
    // Use defaults if no body
  }

  // Fetch post with context
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, assets(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (postError || !post) {
    return jsonWithCookies(response, { error: 'Post not found' }, { status: 404 });
  }

  const context = post.context as Record<string, string>;

  // Generate captions using OpenAI or mock
  let captions: CaptionOutput;
  const useMock = !openai || USE_MOCK_CAPTIONS;

  if (useMock) {
    // Mock captions for development (set USE_MOCK_CAPTIONS=true to force this)
    console.log('[generateCaptions] Using mock captions (USE_MOCK_CAPTIONS is enabled or no API key)');
    captions = {} as CaptionOutput;
    for (const platform of selectedPlatforms) {
      captions[platform] = {
        captionOptions: [
          `${context?.topic || 'Check this out'} ✨ Perfect for ${context?.targetAudience || 'everyone'}! ${context?.cta || 'Like and share!'} #content #viral`,
          `🔥 ${context?.topic || 'Amazing content'} coming your way! ${context?.cta || 'Follow for more!'} #trending`,
          `${context?.tone === 'Luxury' ? '✨ Exclusive: ' : ''}${context?.topic || 'New video'} | ${context?.cta || 'Link in bio'} #new`,
        ],
      };
    }
  } else {
    // Build platform-specific instructions
    const platformInstructions = selectedPlatforms.map((p) => {
      switch (p) {
        case 'instagram':
          return 'Instagram (max 2200 chars, 5-10 relevant hashtags)';
        case 'facebook':
          return 'Facebook (conversational, 0-3 hashtags)';
        case 'linkedin':
          return 'LinkedIn (professional, 3-5 hashtags)';
        case 'tiktok':
          return 'TikTok (trendy, engaging, 3-5 hashtags)';
        case 'youtube':
          return 'YouTube (SEO-friendly description, 0-3 hashtags)';
        default:
          return p;
      }
    }).join('\n');

    const expectedJson = selectedPlatforms.reduce((acc, p) => {
      acc[p] = { captionOptions: ['...', '...', '...'] };
      return acc;
    }, {} as Record<string, { captionOptions: string[] }>);

    const prompt = `Generate engaging social media captions for a video about: "${context?.topic || 'content'}"

Target Audience: ${context?.targetAudience || 'general audience'}
Call to Action: ${context?.cta || 'engage with the content'}
Tone: ${context?.tone || 'professional'}
Brand Voice Notes: ${context?.brandVoice || 'none'}

Generate 3 caption options for EACH of these platforms:
${platformInstructions}

Return valid JSON with this exact structure:
${JSON.stringify(expectedJson)}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a social media marketing expert. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      captions = JSON.parse(responseText.replace(/```json?\n?/g, '').replace(/```/g, ''));
    } catch (err) {
      console.error('OpenAI error:', err);
      // Fallback to mock
      captions = {} as CaptionOutput;
      for (const platform of selectedPlatforms) {
        captions[platform] = {
          captionOptions: [
            `${context?.topic || 'Content'} - ${context?.cta || 'Check it out!'}`,
            `New: ${context?.topic || 'Video'} | ${context?.targetAudience || 'For you'}`,
            `${context?.topic || 'Watch now'} 🔥`,
          ],
        };
      }
    }
  }

  // Store caption set
  await supabase.from('caption_sets').insert({
    post_id: post.id,
    generated_by_model: useMock ? 'mock' : 'gpt-4o-mini',
    raw_output: captions,
  });

  // Create platform_posts entries ONLY for selected platforms
  for (const platform of selectedPlatforms) {
    await supabase.from('platform_posts').upsert({
      post_id: post.id,
      platform,
      status: 'scheduled',
      caption_selected: captions[platform]?.captionOptions?.[0] || '',
    }, { onConflict: 'post_id,platform' });
  }

  return jsonWithCookies(response, { captions });
}
