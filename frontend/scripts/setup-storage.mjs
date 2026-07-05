/**
 * Setup Storage — Cria buckets e configura CORS para S3/R2
 *
 * Uso:
 *   node scripts/setup-storage.mjs
 *
 * Requer variáveis de ambiente:
 *   STORAGE_PROVIDER, STORAGE_ENDPOINT, STORAGE_REGION,
 *   STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY
 *
 * Ou crie um arquivo .env.storage na raiz do projeto.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '..', '.env.storage');

// ─── Buckets padrão ──────────────────────────────────────────────────────────

const BUCKETS = [
  {
    name: 'gs-documentos',
    public: false,
    cors: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
    lifecycle: {
      Rules: [
        {
          ID: 'expire-documents',
          Status: 'Enabled',
          Expiration: { Days: 3650 }, // 10 anos
        },
      ],
    },
  },
  {
    name: 'gs-certificados',
    public: false,
    cors: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
    lifecycle: {
      Rules: [
        {
          ID: 'expire-certificates',
          Status: 'Enabled',
          Expiration: { Days: 3650 }, // 10 anos (ICP-Brasil)
        },
      ],
    },
  },
  {
    name: 'gs-notas-fiscais',
    public: false,
    cors: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
    lifecycle: {
      Rules: [
        {
          ID: 'expire-nf',
          Status: 'Enabled',
          Expiration: { Days: 1825 }, // 5 anos (fiscal)
        },
      ],
    },
  },
];

// ─── Utilitários ─────────────────────────────────────────────────────────────

function loadEnv() {
  // Tenta carregar de .env.storage ou variáveis de ambiente
  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      const value = rest.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  }

  const required = ['STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`
❌ Variáveis obrigatórias faltando: ${missing.join(', ')}

Crie um arquivo .env.storage:
  STORAGE_PROVIDER=s3
  STORAGE_ENDPOINT=
  STORAGE_REGION=us-east-1
  STORAGE_ACCESS_KEY_ID=sua_chave
  STORAGE_SECRET_ACCESS_KEY=seu_secret
  STORAGE_BUCKET=gs-documentos
`);
    process.exit(1);
  }
}

function getProvider() {
  const provider = process.env.STORAGE_PROVIDER || 's3';
  if (!['s3', 'r2'].includes(provider)) {
    console.error(`❌ Provider inválido: ${provider}. Use 's3' ou 'r2'.`);
    process.exit(1);
  }
  return provider;
}

function getS3Config() {
  const provider = getProvider();
  const endpoint = process.env.STORAGE_ENDPOINT || '';
  const region = process.env.STORAGE_REGION || 'us-east-1';

  let s3Endpoint = endpoint;
  if (!s3Endpoint && provider === 'r2') {
    console.error('❌ R2 requer STORAGE_ENDPOINT configurado.');
    process.exit(1);
  }

  return {
    provider,
    endpoint: s3Endpoint,
    region,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  };
}

// ─── Comandos AWS CLI ────────────────────────────────────────────────────────

function awsCommand(args, config) {
  const cmd = ['aws', ...args].join(' ');
  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: config.secretAccessKey,
    AWS_DEFAULT_REGION: config.region,
    AWS_DEFAULT_OUTPUT: 'json',
  };

  if (config.endpoint) {
    env.AWS_ENDPOINT_URL = config.endpoint;
  }

  console.log(`  $ ${cmd}`);
  try {
    const output = execSync(cmd, { env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output.trim() || '{}');
  } catch (error) {
    const stderr = error.stderr?.toString() || '';
    if (stderr.includes('NoSuchBucket')) return null;
    if (stderr.includes('BucketAlreadyOwnedByYou')) return 'EXISTS';
    throw new Error(stderr);
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

async function setup() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     🚀 GS VEMAPI — Setup de Armazenamento S3/R2      ║
╚═══════════════════════════════════════════════════════╝
`);

  loadEnv();
  const config = getS3Config();
  const providerLabel = config.provider.toUpperCase();

  console.log(`Provedor: ${providerLabel}`);
  console.log(`Região:   ${config.region}`);
  if (config.endpoint) console.log(`Endpoint: ${config.endpoint}`);
  console.log('');

  for (const bucket of BUCKETS) {
    console.log(`📦 Bucket: ${bucket.name}`);

    // 1. Criar bucket
    console.log(`  Criando bucket...`);
    try {
      let createArgs = ['s3api', 'create-bucket', '--bucket', bucket.name];
      if (config.region !== 'us-east-1') {
        createArgs.push('--create-bucket-configuration', `LocationConstraint=${config.region}`);
      }
      if (config.provider === 'r2') {
        createArgs.push('--endpoint-url', config.endpoint);
      }
      const result = awsCommand(createArgs, config);
      if (result === 'EXISTS') {
        console.log(`  ⚠️  Bucket já existe. Continuando...`);
      } else {
        console.log(`  ✅ Bucket criado: ${bucket.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Erro ao criar bucket: ${error.message}`);
      continue;
    }

    // 2. Configurar CORS
    console.log(`  Configurando CORS...`);
    try {
      const corsJson = JSON.stringify(bucket.cors);
      const tmpFile = resolve(__dirname, '..', '.cors-tmp.json');
      writeFileSync(tmpFile, corsJson, 'utf8');

      let corsArgs = ['s3api', 'put-bucket-cors', '--bucket', bucket.name, '--cors-configuration', `file://${tmpFile}`];
      if (config.provider === 'r2') corsArgs.push('--endpoint-url', config.endpoint);
      awsCommand(corsArgs, config);
      console.log(`  ✅ CORS configurado`);
    } catch (error) {
      console.error(`  ❌ Erro ao configurar CORS: ${error.message}`);
    }

    // 3. Configurar lifecycle (expiração)
    console.log(`  Configurando lifecycle...`);
    try {
      const lifecycleJson = JSON.stringify(bucket.lifecycle);
      const tmpFile = resolve(__dirname, '..', '.lifecycle-tmp.json');
      writeFileSync(tmpFile, lifecycleJson, 'utf8');

      let lcArgs = ['s3api', 'put-bucket-lifecycle-configuration', '--bucket', bucket.name, '--lifecycle-configuration', `file://${tmpFile}`];
      if (config.provider === 'r2') lcArgs.push('--endpoint-url', config.endpoint);
      awsCommand(lcArgs, config);
      console.log(`  ✅ Lifecycle configurado`);
    } catch (error) {
      // R2 não suporta lifecycle via S3 API
      if (config.provider === 'r2') {
        console.log(`  ⏭️  Lifecycle não suportado via API no R2. Configure manualmente no dashboard.`);
      } else {
        console.error(`  ❌ Erro ao configurar lifecycle: ${error.message}`);
      }
    }

    // 4. Bloquear acesso público (padrão)
    if (!bucket.public) {
      console.log(`  Bloqueando acesso público...`);
      try {
        let pbArgs = ['s3api', 'put-public-access-block', '--bucket', bucket.name, '--public-access-block-configuration', 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'];
        if (config.provider === 'r2') pbArgs.push('--endpoint-url', config.endpoint);
        awsCommand(pbArgs, config);
        console.log(`  ✅ Acesso público bloqueado`);
      } catch (error) {
        if (config.provider === 'r2') {
          console.log(`  ⏭️  R2: configure o acesso no dashboard.`);
        } else {
          console.error(`  ❌ Erro ao bloquear acesso público: ${error.message}`);
        }
      }
    }

    console.log('');
  }

  // Limpar arquivos temporários
  try {
    const fs = await import('fs');
    const files = ['.cors-tmp.json', '.lifecycle-tmp.json'];
    for (const f of files) {
      const p = resolve(__dirname, '..', f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch {}

  console.log(`
╔═══════════════════════════════════════════════════════╗
║  ✅ Setup concluído!                                  ║
║                                                       ║
║  Buckets criados:                                     ║
║    • gs-documentos    — RG, CNH, comprovantes         ║
║    • gs-certificados  — Certificados digitais         ║
║    • gs-notas-fiscais — NFs em PDF/XML                ║
║                                                       ║
║  Próximo passo:                                       ║
║  Adicione ao .env.local:                              ║
║    STORAGE_BUCKET=gs-documentos                       ║
║    STORAGE_PUBLIC_URL=...                            ║
╚═══════════════════════════════════════════════════════╝
`);
}

setup().catch((error) => {
  console.error(`\n❌ Erro durante setup:`, error.message);
  process.exit(1);
});
