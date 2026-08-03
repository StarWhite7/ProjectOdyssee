import { describe, expect, it, vi } from 'vitest';
import { AiConfigurationError, readAiConfiguration, resolveWithProvider } from './ai-provider';

const environment = (values: Record<string, string | undefined>) => (name: string) => values[name];

describe('AI provider selection', () => {
  it('normalizes Gemini and calls Gemini without calling Mock', async () => {
    const configuration = readAiConfiguration(
      environment({ AI_PROVIDER: '  GeMiNi ', GEMINI_API_KEY: 'key', GEMINI_MODEL: ' model ' }),
      { log: vi.fn() },
    );
    const gemini = vi.fn().mockResolvedValue('gemini-result');
    const mock = vi.fn(() => 'mock-result');

    await expect(resolveWithProvider(configuration, {}, { gemini, mock })).resolves.toBe(
      'gemini-result',
    );
    expect(gemini).toHaveBeenCalledWith({}, 'model', 'key');
    expect(mock).not.toHaveBeenCalled();
  });

  it('calls Mock without calling Gemini only when Mock is selected', async () => {
    const configuration = readAiConfiguration(environment({ AI_PROVIDER: 'mock' }), {
      log: vi.fn(),
    });
    const gemini = vi.fn().mockResolvedValue('gemini-result');
    const mock = vi.fn(() => 'mock-result');

    await expect(resolveWithProvider(configuration, {}, { gemini, mock })).resolves.toBe(
      'mock-result',
    );
    expect(mock).toHaveBeenCalledOnce();
    expect(gemini).not.toHaveBeenCalled();
  });

  it('rejects an unknown provider instead of falling back to Mock', () => {
    expect(() =>
      readAiConfiguration(environment({ AI_PROVIDER: 'other' }), { log: vi.fn() }),
    ).toThrowError(new AiConfigurationError('unsupported_ai_provider'));
  });

  it('rejects an empty Gemini key before any network implementation can run', () => {
    const network = vi.fn();
    expect(() =>
      readAiConfiguration(environment({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: '  ' }), {
        log: vi.fn(),
      }),
    ).toThrowError(new AiConfigurationError('gemini_not_configured'));
    expect(network).not.toHaveBeenCalled();
  });

  it('logs only non-sensitive provider diagnostics', () => {
    const log = vi.fn();
    const error = vi.fn();
    readAiConfiguration(
      environment({
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'gemini-secret-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
      }),
      { log, error },
    );
    const output = JSON.stringify(log.mock.calls);

    expect(output).toContain('ai_provider_selected');
    expect(output).toContain('hasGeminiKey');
    expect(output).not.toContain('gemini-secret-key');
    expect(error).not.toHaveBeenCalled();
  });

  it('logs a safe configuration code when the Gemini key is missing', () => {
    const error = vi.fn();
    expect(() =>
      readAiConfiguration(environment({ AI_PROVIDER: 'gemini' }), { log: vi.fn(), error }),
    ).toThrowError(new AiConfigurationError('gemini_not_configured'));

    expect(JSON.stringify(error.mock.calls)).toContain('ai_configuration_failed');
    expect(JSON.stringify(error.mock.calls)).toContain('gemini_not_configured');
  });
});
