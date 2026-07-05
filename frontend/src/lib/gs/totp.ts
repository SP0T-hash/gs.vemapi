import { createHmac, randomBytes, createHash } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────────

export interface TOTPConfig {
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  period: number;
  issuer: string;
}

export interface TOTPSetup {
  secret: string;
  secretHex: string;
  otpauthUrl: string;
  qrCodeSvg: string;
  backupCodes: string[];
}

export interface TOTPVerification {
  valid: boolean;
  delta?: number;
  error?: string;
}

export interface User2FAData {
  secret: string;
  enabled: boolean;
  backupCodesHashed: string[];
}

const DEFAULT_CONFIG: TOTPConfig = {
  algorithm: 'sha1',
  digits: 6,
  period: 30,
  issuer: 'GS VEMAPI',
};

// ─── Base32 (RFC 4648) ────────────────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 0x1F];
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1F];
  }
  const pad = (8 - (result.length % 8)) % 8;
  return result + '='.repeat(pad);
}

function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/[=\s\-]/g, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xFF);
    }
  }
  return Buffer.from(bytes);
}

// ─── TOTP Core (RFC 4226 / RFC 6238) ─────────────────────────────────────────────

export function generateTOTPSecret(): { base32: string; hex: string } {
  const buf = randomBytes(20);
  return {
    base32: base32Encode(buf),
    hex: buf.toString('hex'),
  };
}

function hotp(secretHex: string, counter: number, config: TOTPConfig): string {
  const counterBuf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter & 0xff;
    counter >>>= 8;
  }

  const key = Buffer.from(secretHex, 'hex');
  const hmac = createHmac(config.algorithm, key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = Math.pow(10, config.digits);
  return String(code % mod).padStart(config.digits, '0');
}

export function generateTOTPToken(secretHex: string, options?: Partial<TOTPConfig>): string {
  const config = { ...DEFAULT_CONFIG, ...options };
  const timeStep = Math.floor(Date.now() / 1000 / config.period);
  return hotp(secretHex, timeStep, config);
}

export function verifyTOTPToken(
  token: string,
  secretHex: string,
  options?: Partial<TOTPConfig> & { window?: number }
): TOTPVerification {
  const config = { ...DEFAULT_CONFIG, ...options };
  const window = options?.window ?? 1;
  const timeStep = Math.floor(Date.now() / 1000 / config.period);

  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secretHex, timeStep + i, config);
    if (candidate === token) {
      return { valid: true, delta: i };
    }
  }

  return { valid: false, error: 'Invalid TOTP code' };
}

// ─── Backup Codes ─────────────────────────────────────────────────────────────────

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(5);
    const part1 = bytes.readUInt16BE(0) % 100000;
    const part2 = bytes.readUInt16BE(2) % 100000;
    codes.push(
      `${String(part1).padStart(6, '0').slice(0, 5)}-${String(part2).padStart(5, '0')}`
        .toUpperCase()
    );
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9-]/g, '')).digest('hex');
}

export function verifyBackupCode(code: string, hashedCodes: string[]): string | null {
  const hash = hashBackupCode(code);
  return hashedCodes.find(h => h === hash) ?? null;
}

// ─── QR Code Generator ────────────────────────────────────────────────────────────

class GF256 {
  static readonly PRIMITIVE = 0x11d;
  static expTable: number[] = new Array(512);
  static logTable: number[] = new Array(256);
  static initialized = false;

  static init(): void {
    if (this.initialized) return;
    let val = 1;
    for (let i = 0; i < 255; i++) {
      this.expTable[i] = val;
      this.logTable[val] = i;
      val <<= 1;
      if (val >= 256) val ^= this.PRIMITIVE;
    }
    for (let i = 255; i < 512; i++) {
      this.expTable[i] = this.expTable[i - 255];
    }
    this.initialized = true;
  }

  static add(a: number, b: number): number { return a ^ b; }

  static mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.expTable[this.logTable[a] + this.logTable[b]];
  }

  static polyMul(a: number[], b: number[]): number[] {
    const result = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        result[i + j] = this.add(result[i + j], this.mul(a[i], b[j]));
      }
    }
    return result;
  }
}

function rsGeneratorPoly(degree: number): number[] {
  GF256.init();
  let g: number[] = [1];
  for (let i = 0; i < degree; i++) {
    g = GF256.polyMul(g, [1, GF256.expTable[i]]);
  }
  return g;
}

function rsEncode(message: number[], ecBytes: number): number[] {
  GF256.init();
  const generator = rsGeneratorPoly(ecBytes);
  const padded = [...message, ...new Array(ecBytes).fill(0)];
  for (let i = 0; i < message.length; i++) {
    if (padded[i] === 0) continue;
    const scale = GF256.logTable[padded[i]];
    for (let j = 0; j < generator.length; j++) {
      padded[i + j] = GF256.add(padded[i + j], GF256.expTable[scale + GF256.logTable[generator[j]]]);
    }
  }
  return [...message, ...padded.slice(message.length)];
}

const QR_ALPHANUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

function qrCanEncodeAlphanum(s: string): boolean {
  for (const ch of s) {
    if (!QR_ALPHANUM.includes(ch)) return false;
  }
  return true;
}

interface QRVersionInfo {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  blocks: number;
}

const QR_EC_TABLE: Record<string, QRVersionInfo[]> = {
  L: [
    { version: 1, totalCodewords: 19, dataCodewords: 19, ecCodewordsPerBlock: 7, blocks: 1 },
    { version: 2, totalCodewords: 34, dataCodewords: 34, ecCodewordsPerBlock: 10, blocks: 1 },
    { version: 3, totalCodewords: 55, dataCodewords: 55, ecCodewordsPerBlock: 15, blocks: 1 },
    { version: 4, totalCodewords: 80, dataCodewords: 80, ecCodewordsPerBlock: 20, blocks: 1 },
    { version: 5, totalCodewords: 108, dataCodewords: 108, ecCodewordsPerBlock: 26, blocks: 1 },
    { version: 6, totalCodewords: 136, dataCodewords: 136, ecCodewordsPerBlock: 18, blocks: 2 },
    { version: 7, totalCodewords: 156, dataCodewords: 156, ecCodewordsPerBlock: 20, blocks: 2 },
    { version: 8, totalCodewords: 194, dataCodewords: 194, ecCodewordsPerBlock: 24, blocks: 2 },
    { version: 9, totalCodewords: 232, dataCodewords: 232, ecCodewordsPerBlock: 30, blocks: 2 },
    { version: 10, totalCodewords: 274, dataCodewords: 274, ecCodewordsPerBlock: 18, blocks: 4 },
  ],
  M: [
    { version: 1, totalCodewords: 16, dataCodewords: 16, ecCodewordsPerBlock: 10, blocks: 1 },
    { version: 2, totalCodewords: 28, dataCodewords: 28, ecCodewordsPerBlock: 16, blocks: 1 },
    { version: 3, totalCodewords: 44, dataCodewords: 44, ecCodewordsPerBlock: 26, blocks: 1 },
    { version: 4, totalCodewords: 64, dataCodewords: 64, ecCodewordsPerBlock: 18, blocks: 2 },
    { version: 5, totalCodewords: 86, dataCodewords: 86, ecCodewordsPerBlock: 24, blocks: 2 },
    { version: 6, totalCodewords: 108, dataCodewords: 108, ecCodewordsPerBlock: 16, blocks: 4 },
    { version: 7, totalCodewords: 130, dataCodewords: 130, ecCodewordsPerBlock: 18, blocks: 4 },
    { version: 8, totalCodewords: 156, dataCodewords: 156, ecCodewordsPerBlock: 22, blocks: 4 },
    { version: 9, totalCodewords: 180, dataCodewords: 180, ecCodewordsPerBlock: 22, blocks: 5 },
    { version: 10, totalCodewords: 206, dataCodewords: 206, ecCodewordsPerBlock: 26, blocks: 5 },
  ],
};

function qrGetVersionInfo(dataByteLen: number, ecLevel: 'L' | 'M'): QRVersionInfo {
  const table = QR_EC_TABLE[ecLevel];
  for (const info of table) {
    if (dataByteLen <= info.dataCodewords) {
      return info;
    }
  }
  return table[table.length - 1];
}

function qrBuildByteData(data: string, version: number, dataCodewords: number): number[] {
  const bytes: number[] = [];
  const utf8 = Buffer.from(data, 'utf8');

  const modeIndicator = 0b0100;
  const charCountBits = version <= 9 ? 8 : 16;
  bytes.push((modeIndicator << 4) | ((utf8.length >> charCountBits) & 0x0f));
  for (let i = charCountBits - 4; i >= 0; i -= 8) {
    if (i >= 8) {
      bytes.push((utf8.length >> (i - 4)) & 0xff);
    }
  }
  if (charCountBits <= 8) {
    bytes[0] = (modeIndicator << 4) | ((utf8.length >> 4) & 0x0f);
    bytes.push(((utf8.length & 0x0f) << 4) | (utf8[0] >> 4));
    for (let i = 1; i < utf8.length; i++) {
      const hi = (utf8[i - 1] & 0x0f) << 4;
      const lo = (utf8[i] >> 4) & 0x0f;
      bytes.push(hi | lo);
    }
    if (utf8.length > 0) {
      bytes.push((utf8[utf8.length - 1] & 0x0f) << 4);
    }
  } else {
    for (let i = 0; i < utf8.length; i++) {
      bytes.push(utf8[i]);
    }
  }

  while (bytes.length < dataCodewords) {
    if (bytes.length < dataCodewords) bytes.push(0xec);
    if (bytes.length < dataCodewords) bytes.push(0x11);
  }

  return bytes.slice(0, dataCodewords);
}

function qrBuildMatrix(version: number, data: number[], ecLevel: 'L' | 'M'): boolean[][] {
  const size = 21 + 4 * version;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // Finder patterns
  function placeFinder(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        if (row + r < 0 || row + r >= size || col + c < 0 || col + c >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const outer = r === 0 || r === 6 || c === 0 || c === 6;
          const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[row + r][col + c] = outer || inner;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Separators
  for (let i = 0; i < 8; i++) {
    if (i + 7 < size) matrix[7][i + 7] = false;
    if (i + 7 < size) matrix[i + 7][7] = false;
    matrix[7][i] = false;
    if (i < size - 7) matrix[i][7] = false;
    matrix[7][size - 1 - i] = false;
    if (i < size - 7) matrix[i][size - 8] = false;
    if (i + 7 < size) matrix[i + 7][size - 8] = false;
    matrix[size - 8][i] = false;
    if (i + 7 < size) matrix[size - 8][i + 7] = false;
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns (for version >= 2)
  const alignmentCenters: Record<number, number[]> = {
    2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46],
    10: [6, 28, 50],
  };

  const centers = alignmentCenters[version];
  if (centers) {
    for (const row of centers) {
      for (const col of centers) {
        if ((row === 6 && col === 6) ||
            (row === 6 && col === size - 7) ||
            (row === size - 7 && col === 6)) continue;
        if (row + 2 >= size || col + 2 >= size) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
            const isCenter = Math.abs(r) <= 1 && Math.abs(c) <= 1;
            if (row + r < 0 || row + r >= size || col + c < 0 || col + c >= size) continue;
            matrix[row + r][col + c] = r === 0 && c === 0 || isOuter;
          }
        }
      }
    }
  }

  // Data placement
  const info = qrGetVersionInfo(0, ecLevel);
  const paddedCodewords = qrBuildByteData('', version, info.dataCodewords);
  const encodedBytes = rsEncode(data, info.ecCodewordsPerBlock * info.blocks - info.dataCodewords);
  const codewords = [...data, ...encodedBytes.slice(data.length)];

  let bitIndex = 0;
  let col = size - 1;
  let row = size - 1;
  let dir = -1;

  while (col > 0) {
    if (col === 6) col = 5;

    for (let i = 0; i < size; i++) {
      const r = dir === -1 ? size - 1 - i : i;
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (c < 0 || r < 0 || r >= size || c >= size) continue;

        // Skip reserved areas
        if (r < 9 && (c < 9 || c >= size - 8)) continue;
        if (r >= size - 8 && c < 9) continue;
        if (r >= size - 9 && c >= size - 9 && r < size - 2 && c < size) continue;
        if (c === 6 || r === 6) continue;

        // Skip alignment patterns
        if (centers) {
          let skip = false;
          for (const ac of centers) {
            for (const ar of centers) {
              if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) {
                skip = true;
                break;
              }
            }
            if (skip) break;
          }
          if (skip) continue;
        }

        if (bitIndex < codewords.length * 8) {
          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdx = 7 - (bitIndex % 8);
          if (byteIdx < codewords.length) {
            matrix[r][c] = ((codewords[byteIdx] >> bitIdx) & 1) === 1;
          }
          bitIndex++;
        }
      }
    }
    col -= 2;
    dir *= -1;
  }

  return matrix;
}

function qrMaskPattern(matrix: boolean[][], pattern: number): boolean[][] {
  const size = matrix.length;
  const masked = matrix.map(row => [...row]);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r >= 9 && c < 9) continue;
      if (r < 9 && (c < 9 || c >= size - 8)) continue;
      if (r >= size - 8 && c < 9) continue;
      if (c === 6 || r === 6) continue;

      let shouldFlip = false;
      switch (pattern) {
        case 0: shouldFlip = (r + c) % 2 === 0; break;
        case 1: shouldFlip = r % 2 === 0; break;
        case 2: shouldFlip = c % 3 === 0; break;
        case 3: shouldFlip = (r + c) % 3 === 0; break;
        case 4: shouldFlip = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
        case 5: shouldFlip = (r * c) % 2 + (r * c) % 3 === 0; break;
        case 6: shouldFlip = ((r * c) % 2 + (r * c) % 3) % 2 === 0; break;
        case 7: shouldFlip = ((r * c) % 3 + (r + c) % 2) % 2 === 0; break;
      }

      if (shouldFlip) {
        masked[r][c] = !masked[r][c];
      }
    }
  }

  return masked;
}

function qrPenaltyScore(matrix: boolean[][]): number {
  const size = matrix.length;
  let score = 0;

  // Adjacent modules in row
  for (let r = 0; r < size; r++) {
    let count = 0;
    let prev = false;
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === prev) {
        count++;
      } else {
        if (count >= 5) score += count - 2;
        count = 1;
        prev = matrix[r][c];
      }
    }
    if (count >= 5) score += count - 2;
  }

  // Adjacent modules in column
  for (let c = 0; c < size; c++) {
    let count = 0;
    let prev = false;
    for (let r = 0; r < size; r++) {
      if (matrix[r][c] === prev) {
        count++;
      } else {
        if (count >= 5) score += count - 2;
        count = 1;
        prev = matrix[r][c];
      }
    }
    if (count >= 5) score += count - 2;
  }

  // Block patterns
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (matrix[r][c + 1] === v && matrix[r + 1][c] === v && matrix[r + 1][c + 1] === v) {
        score += 3;
      }
    }
  }

  // 1:1:3:1:1 ratio patterns
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 6; c++) {
      if (!matrix[r][c] && matrix[r][c + 1] && !matrix[r][c + 2] && !matrix[r][c + 3] && !matrix[r][c + 4] && matrix[r][c + 5] && !matrix[r][c + 6]) {
        if ((c === 0 || !matrix[r][c - 1]) && (c + 7 >= size || !matrix[r][c + 7])) {
          score += 40;
        }
      }
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 6; r++) {
      if (!matrix[r][c] && matrix[r + 1][c] && !matrix[r + 2][c] && !matrix[r + 3][c] && !matrix[r + 4][c] && matrix[r + 5][c] && !matrix[r + 6][c]) {
        if ((r === 0 || !matrix[r - 1][c]) && (r + 7 >= size || !matrix[r + 7][c])) {
          score += 40;
        }
      }
    }
  }

  // Dark module proportion
  const total = size * size;
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) dark++;
    }
  }
  const percent = (dark / total) * 100;
  const prev5 = Math.abs(Math.floor(percent / 5) * 5 - 50);
  const next5 = Math.abs(Math.ceil(percent / 5) * 5 - 50);
  score += Math.min(prev5, next5) * 10;

  return score;
}

function qrFormatBits(ecLevel: 'L' | 'M', mask: number): number {
  const ecMap: Record<string, number> = { L: 1, M: 0 };
  const ecBits = ecMap[ecLevel];
  const data = (ecBits << 3) | mask;
  let genPoly = 0b10100110111;
  let codeword = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((codeword >> i) & 1) {
      codeword ^= genPoly << (i - 10);
    }
  }
  return (data << 10) | codeword;
}

function qrPlaceFormatInfo(matrix: boolean[][], ecLevel: 'L' | 'M', mask: number): void {
  const size = matrix.length;
  const format = qrFormatBits(ecLevel, mask);

  // Horizontal
  for (let i = 0; i < 15; i++) {
    const bit = ((format >> (14 - i)) & 1) === 1;
    if (i < 6) {
      matrix[8][i] = i <= 5 ? bit : false;
    } else if (i < 8) {
      matrix[8][i + 1] = bit;
    } else {
      matrix[8][size - 15 + i] = bit;
    }
  }

  // Vertical
  for (let i = 0; i < 15; i++) {
    const bit = ((format >> (14 - i)) & 1) === 1;
    if (i < 6) {
      matrix[i][8] = i <= 5 ? bit : false;
    } else if (i < 8) {
      matrix[i + 1][8] = bit;
    } else {
      matrix[size - 15 + i][8] = bit;
    }
  }

  // Dark module
  matrix[size - 8][8] = true;
}

function qrRenderSVG(matrix: boolean[][]): string {
  const size = matrix.length;
  const moduleSize = 4;
  const imgSize = size * moduleSize;
  const quiet = moduleSize * 2;
  const totalSize = imgSize + quiet * 2;

  let paths = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = c * moduleSize + quiet;
        const y = r * moduleSize + quiet;
        paths += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#1a1a2e"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">
  <rect width="${totalSize}" height="${totalSize}" fill="#ffffff"/>
  ${paths}
</svg>`;
}

function generateQRCodeSVG(data: string, ecLevel: 'L' | 'M' = 'M'): string {
  const utf8bytes = Buffer.from(data, 'utf8');
  const info = qrGetVersionInfo(utf8bytes.length, ecLevel);

  const codewords: number[] = [];
  const modeIndicator = 0b0100;
  const charCountBits = info.version <= 9 ? 8 : 16;

  let encoded: number[] = [];
  if (info.version <= 9) {
    const header = (modeIndicator << 4) | (utf8bytes.length >> 4);
    const second = ((utf8bytes.length & 0x0f) << 4) | ((utf8bytes[0] >> 4) & 0x0f);
    encoded.push(header, second);
    for (let i = 1; i < utf8bytes.length; i++) {
      const hi = (utf8bytes[i - 1] & 0x0f) << 4;
      const lo = (utf8bytes[i] >> 4) & 0x0f;
      encoded.push(hi | lo);
    }
    if (utf8bytes.length > 0) {
      encoded.push((utf8bytes[utf8bytes.length - 1] & 0x0f) << 4);
    }
  } else {
    const header = (modeIndicator << 4) | ((utf8bytes.length >> 12) & 0x0f);
    const lenHi = (utf8bytes.length >> 8) & 0xff;
    const lenLo = utf8bytes.length & 0xff;
    encoded.push(header, lenHi, lenLo);
    for (let i = 0; i < utf8bytes.length; i++) encoded.push(utf8bytes[i]);
  }

  while (encoded.length < info.dataCodewords) {
    if (encoded.length < info.dataCodewords) encoded.push(0xec);
    if (encoded.length < info.dataCodewords) encoded.push(0x11);
  }

  codewords.push(...encoded.slice(0, info.dataCodewords));

  const rsBytes = info.ecCodewordsPerBlock * info.blocks - info.dataCodewords + info.dataCodewords - info.dataCodewords;
  const ecTotal = info.totalCodewords - info.dataCodewords;
  const blocks = info.blocks;
  const ecPerBlock = Math.floor(ecTotal / blocks);
  const dataPerBlock = Math.floor(info.dataCodewords / blocks);

  const allData: number[][] = [];
  const allEC: number[][] = [];
  for (let b = 0; b < blocks; b++) {
    const start = b * dataPerBlock;
    const end = b < blocks - 1 ? start + dataPerBlock : info.dataCodewords;
    const blockData = codewords.slice(start, end);
    allData.push(blockData);
    const encoded = rsEncode(blockData, ecPerBlock);
    allEC.push(encoded.slice(blockData.length));
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < dataPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < allData[b].length) finalCodewords.push(allData[b][i]);
    }
  }
  for (let b = 0; b < blocks; b++) {
    while (allData[b].length > dataPerBlock) {
      finalCodewords.push(allData[b][dataPerBlock]);
      allData[b].splice(dataPerBlock, 1);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < allEC[b].length) finalCodewords.push(allEC[b][i]);
    }
  }

  let matrix = qrBuildMatrix(info.version, finalCodewords.slice(0, info.dataCodewords), ecLevel);

  let bestScore = Infinity;
  let bestMask = 0;
  for (let m = 0; m < 8; m++) {
    const masked = qrMaskPattern(matrix, m);
    const score = qrPenaltyScore(masked);
    if (score < bestScore) {
      bestScore = score;
      bestMask = m;
    }
  }

  matrix = qrMaskPattern(matrix, bestMask);
  qrPlaceFormatInfo(matrix, ecLevel, bestMask);

  return qrRenderSVG(matrix);
}

// ─── Setup / Recovery ──────────────────────────────────────────────────────────────

export function generateSetupData(email: string, issuer?: string): TOTPSetup {
  const config = { ...DEFAULT_CONFIG };
  if (issuer) config.issuer = issuer;

  const { base32, hex } = generateTOTPSecret();
  const encodedIssuer = encodeURIComponent(config.issuer);
  const encodedEmail = encodeURIComponent(email);
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${base32}&issuer=${encodedIssuer}&algorithm=${config.algorithm.toUpperCase()}&digits=${config.digits}&period=${config.period}`;

  const backupCodes = generateBackupCodes();

  // Generate QR code SVG from the otpauth URL
  const qrCodeSvg = generateQRCodeSVG(otpauthUrl);

  return {
    secret: base32,
    secretHex: hex,
    otpauthUrl,
    qrCodeSvg,
    backupCodes,
  };
}

export function generateRecoveryQR(email: string, secretHex: string): string {
  const { base32 } = (() => {
    const buf = Buffer.from(secretHex, 'hex');
    return { base32: base32Encode(buf) };
  })();

  const encodedIssuer = encodeURIComponent(DEFAULT_CONFIG.issuer);
  const encodedEmail = encodeURIComponent(email);
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${base32}&issuer=${encodedIssuer}`;

  const qrSvg = generateQRCodeSVG(otpauthUrl);
  const backupCodes = generateBackupCodes();

  return `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
<h1>GS VEMAPI — Recuperação 2FA</h1>
<p>Escaneie o QR code abaixo no seu aplicativo autenticador:</p>
${qrSvg}
<p>Chave manual: <code style="font-size:18px;background:#eee;padding:8px">${base32}</code></p>
<h2>Códigos de Backup</h2>
<p>Guarde estes códigos em local seguro. Cada um só pode ser usado uma vez.</p>
<ul style="list-style:none;font-size:16px;font-family:monospace">
${backupCodes.map(c => `<li>${c}</li>`).join('\n')}
</ul>
<p style="color:#666;margin-top:40px">Gerado em ${new Date().toISOString()}</p>
</body></html>`;
}

// ─── 2FA Store (In-Memory) ───────────────────────────────────────────────────────

export const twoFactorStore = new Map<string, User2FAData>();

export function initUser2FA(userId: string): User2FAData {
  const data: User2FAData = { secret: '', enabled: false, backupCodesHashed: [] };
  twoFactorStore.set(userId, data);
  return data;
}

export function getUser2FA(userId: string): User2FAData | undefined {
  return twoFactorStore.get(userId);
}

export function enableUser2FA(userId: string, secret: string, backupCodes: string[]): void {
  const hashed = backupCodes.map(hashBackupCode);
  twoFactorStore.set(userId, {
    secret,
    enabled: true,
    backupCodesHashed: hashed,
  });
}

export function disableUser2FA(userId: string): void {
  twoFactorStore.set(userId, { secret: '', enabled: false, backupCodesHashed: [] });
}

export function removeUsedBackupCode(userId: string, hash: string): boolean {
  const user = twoFactorStore.get(userId);
  if (!user) return false;
  const idx = user.backupCodesHashed.indexOf(hash);
  if (idx === -1) return false;
  user.backupCodesHashed.splice(idx, 1);
  return true;
}
