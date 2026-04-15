/**
 * Pro License feature gate for Coder1 IDE.
 *
 * Team features (multi-user collaboration, shared workspaces) require
 * a Pro license. All other features are free and open source (MIT).
 *
 * Set CODER1_PRO_LICENSE in your .env.local to enable team features.
 */

export function isProLicenseActive(): boolean {
  const license = process.env.CODER1_PRO_LICENSE;
  return typeof license === 'string' && license.length > 0;
}

export function requireProLicense(): void {
  if (!isProLicenseActive()) {
    throw new Error(
      'This feature requires a Coder1 Pro license. ' +
      'Set CODER1_PRO_LICENSE in your .env.local or visit https://coder1.ai/pro'
    );
  }
}
