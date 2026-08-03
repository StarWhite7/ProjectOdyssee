export type AiProvider = 'gemini' | 'mock';

export type AiConfiguration =
  | { provider: 'mock'; model: null; apiKey: null }
  | { provider: 'gemini'; model: string; apiKey: string };

export class AiConfigurationError extends Error {
  constructor(readonly code: 'unsupported_ai_provider' | 'gemini_not_configured') {
    super(code);
    this.name = 'AiConfigurationError';
  }
}

export function readAiConfiguration(
  readEnvironment: (name: string) => string | undefined,
  logger: Pick<Console, 'log'> & Partial<Pick<Console, 'error'>> = console,
): AiConfiguration {
  const provider = (readEnvironment('AI_PROVIDER') ?? 'mock').trim().toLowerCase();
  const apiKey = readEnvironment('GEMINI_API_KEY')?.trim() ?? '';
  const model = readEnvironment('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash';

  logger.log(
    JSON.stringify({
      event: 'ai_provider_selected',
      provider,
      model: provider === 'gemini' ? model : null,
      hasGeminiKey: Boolean(apiKey),
    }),
  );

  if (provider !== 'gemini' && provider !== 'mock') {
    logger.error?.(
      JSON.stringify({ event: 'ai_configuration_failed', code: 'unsupported_ai_provider' }),
    );
    throw new AiConfigurationError('unsupported_ai_provider');
  }
  if (provider === 'gemini') {
    if (!apiKey) {
      logger.error?.(
        JSON.stringify({ event: 'ai_configuration_failed', code: 'gemini_not_configured' }),
      );
      throw new AiConfigurationError('gemini_not_configured');
    }
    return { provider, model, apiKey };
  }
  return { provider, model: null, apiKey: null };
}

export async function resolveWithProvider<TContext, TResult>(
  configuration: AiConfiguration,
  context: TContext,
  implementations: {
    gemini: (context: TContext, model: string, apiKey: string) => Promise<TResult>;
    mock: (context: TContext) => TResult;
  },
): Promise<TResult> {
  if (configuration.provider === 'gemini') {
    return implementations.gemini(context, configuration.model, configuration.apiKey);
  }
  return implementations.mock(context);
}
