// Env parsing (PRD section 13). Everything the app needs is read here once and injected.

export type AppConfig = {
  port: number;
  isProduction: boolean;
  clientOrigin: string;
  recruitmentOpen: boolean;
  whatsappUrl: string;
  adminExportToken: string | undefined;
  allowedEmailDomain: string | undefined;
  storageDriver: 'local' | 'cloudinary';
  uploadDir: string;
  cloudinaryUrl: string | undefined;
};

const ADMIN_TOKEN_MIN_LENGTH = 32;

function parseBool(name: string, raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be "true" or "false"`);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProduction = env['NODE_ENV'] === 'production';

  const storageDriver = env['STORAGE_DRIVER'] ?? 'local';
  if (storageDriver !== 'local' && storageDriver !== 'cloudinary') {
    throw new Error('STORAGE_DRIVER must be "local" or "cloudinary"');
  }
  const cloudinaryUrl = env['CLOUDINARY_URL'] || undefined;
  if (storageDriver === 'cloudinary' && !cloudinaryUrl) {
    throw new Error('CLOUDINARY_URL is required when STORAGE_DRIVER=cloudinary');
  }

  const adminExportToken = env['ADMIN_EXPORT_TOKEN'] || undefined;
  if (adminExportToken !== undefined && adminExportToken.length < ADMIN_TOKEN_MIN_LENGTH) {
    throw new Error(`ADMIN_EXPORT_TOKEN must be at least ${ADMIN_TOKEN_MIN_LENGTH} characters`);
  }

  const clientOrigin = env['CLIENT_ORIGIN'] || undefined;
  if (isProduction && !clientOrigin) throw new Error('CLIENT_ORIGIN is required in production');

  return {
    port: Number(env['PORT'] ?? 4000),
    isProduction,
    clientOrigin: clientOrigin ?? 'http://localhost:5173',
    recruitmentOpen: parseBool('RECRUITMENT_OPEN', env['RECRUITMENT_OPEN'], true),
    whatsappUrl: env['WHATSAPP_COMMUNITY_URL'] ?? '',
    adminExportToken,
    allowedEmailDomain: env['ALLOWED_EMAIL_DOMAIN']?.trim().toLowerCase().replace(/^@/, '') || undefined,
    storageDriver,
    uploadDir: env['UPLOAD_DIR'] || './uploads',
    cloudinaryUrl,
  };
}
