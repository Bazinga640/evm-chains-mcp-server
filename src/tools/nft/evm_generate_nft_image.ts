/**
 * Generate NFT Image Tool
 *
 * Unified tool supporting 3 input modes:
 * 1. AI Generation (free Pollinations or paid services)
 * 2. Existing URL
 * 3. Local file path
 */

import { z } from 'zod';
import { imageGenerator, ImageGenerationRequest } from '../../utils/ai-image-generation.js';

const inputSchema = z.object({
  // Mode 1: AI Generation
  prompt: z.string().optional().describe('Text description for AI image generation'),
  style: z.enum(['realistic', 'artistic', 'cartoon', 'fantasy', 'cyberpunk', 'minimalist']).optional().describe('Art style for AI generation'),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1').describe('Image aspect ratio'),
  quality: z.enum(['standard', 'high', 'ultra']).optional().default('high').describe('Generation quality'),
  seed: z.number().optional().describe('Random seed for reproducible generation'),
  model: z.string().optional().describe('Specific model (flux, turbo, etc.)'),
  service: z.enum(['pollinations', 'flux', 'stable-diffusion', 'playground']).optional().describe('AI service to use (default: pollinations - free)'),

  // Mode 2: Existing URL
  imageUrl: z.string().optional().describe('URL of existing image to use'),

  // Mode 3: Local file
  imagePath: z.string().optional().describe('Local file path to existing image')
}).refine(
  (data) => {
    // Exactly one input method must be provided
    const methods = [data.prompt, data.imageUrl, data.imagePath].filter(Boolean).length;
    return methods === 1;
  },
  {
    message: 'Provide exactly ONE of: prompt (AI generation), imageUrl (existing URL), or imagePath (local file)'
  }
);

export async function handleGenerateNftImage(
  args: z.infer<typeof inputSchema>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const startTime = Date.now();

  try {
    const validated = inputSchema.parse(args);

    // Mode 1: AI Generation
    if (validated.prompt) {
      const request: ImageGenerationRequest = {
        prompt: validated.prompt,
        style: validated.style,
        aspectRatio: validated.aspectRatio,
        quality: validated.quality,
        seed: validated.seed,
        model: validated.model
      };

      const result = await imageGenerator.generateImage(request);

      if (!result.success || (!result.imageUrl && !result.localPath)) {
        throw new Error(result.error || 'Image generation failed');
      }

      // Generate suggested filename
      const sanitizedPrompt = validated.prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
      const timestamp = Date.now();
      const suggestedFilename = `${sanitizedPrompt}-${timestamp}.png`;

      const response = {
        success: true,
        mode: 'ai_generation',
        imageUrl: result.imageUrl,
        localPath: result.localPath,
        prompt: result.prompt,
        model: result.model,
        service: validated.service || 'pollinations',
        style: validated.style,
        aspectRatio: validated.aspectRatio,
        cost: result.cost || 0,
        suggestedFilename,
        nextSteps: [
          'Upload to IPFS: evm_create_nft_with_ipfs or evm_upload_image_to_ipfs',
          'Or use evm_create_complete_package for full workflow',
          `Image ready at: ${result.imageUrl || result.localPath}`
        ],
        aiServices: {
          free: 'Pollinations.ai (default, no API key needed)',
          paid: 'FLUX, Stable Diffusion, Playground (requires API keys)',
          current: result.model
        },
        executionTime: `${Date.now() - startTime}ms`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    // Mode 2: Existing URL
    if (validated.imageUrl) {
      // Validate URL format
      try {
        new URL(validated.imageUrl);
      } catch {
        throw new Error('Invalid image URL format');
      }

      const response = {
        success: true,
        mode: 'existing_url',
        imageUrl: validated.imageUrl,
        validation: {
          urlValid: true,
          accessible: 'Not checked - will be validated during IPFS upload'
        },
        nextSteps: [
          'Upload to IPFS: evm_create_nft_with_ipfs (will download and upload)',
          'Or use directly if already hosted permanently',
          'Recommended: Upload to IPFS for decentralization'
        ],
        note: 'Using existing image URL. Ensure URL is permanent and accessible.',
        executionTime: `${Date.now() - startTime}ms`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    // Mode 3: Local file
    if (validated.imagePath) {
      // Note: We don't validate file existence here since this tool just prepares the path
      // The IPFS upload tool will validate when it tries to read the file

      const response = {
        success: true,
        mode: 'local_file',
        imagePath: validated.imagePath,
        validation: {
          pathProvided: true,
          fileWillBeChecked: 'During IPFS upload'
        },
        nextSteps: [
          'Upload to IPFS: evm_upload_image_to_ipfs with this path',
          'Or use evm_create_nft_with_ipfs for complete workflow',
          'File will be validated when upload begins'
        ],
        note: 'Using local file path. Ensure file exists and is accessible.',
        executionTime: `${Date.now() - startTime}ms`
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }

    // Should never reach here due to refine validation
    throw new Error('No valid input method provided');

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          inputModes: {
            ai_generation: 'Provide "prompt" parameter',
            existing_url: 'Provide "imageUrl" parameter',
            local_file: 'Provide "imagePath" parameter'
          },
          examples: {
            freeAI: '{ prompt: "cyberpunk cat NFT", style: "cyberpunk" }',
            paidAI: '{ prompt: "realistic portrait", service: "flux" }',
            url: '{ imageUrl: "https://example.com/art.png" }',
            file: '{ imagePath: "/Users/me/Desktop/art.jpg" }'
          },
          aiServices: {
            pollinations: 'Free, no API key (default)',
            flux: 'Requires FLUX_API_KEY environment variable',
            stableDiffusion: 'Requires HUGGINGFACE_API_KEY environment variable',
            playground: 'Requires PLAYGROUND_API_KEY environment variable'
          },
          timestamp: new Date().toISOString(),
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}
