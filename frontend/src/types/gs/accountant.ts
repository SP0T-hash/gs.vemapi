/**
 * Tipos do Módulo do Contador
 *
 * - Carteira de certificados dos clientes
 * - Scanner de certificados na máquina do cliente (PowerShell)
 * - Notas Fiscais
 */

export interface GS_CarteiraCertificado {
  id: string;
  contador_id: string;
  cliente_id: string;
  pedido_id?: string;
  status: 'ATIVO' | 'EXPIRADO' | 'RENOVACAO_PENDENTE';
  data_expiracao: string;
  lembrete_60d: boolean;
  lembrete_30d: boolean;
  lembrete_15d: boolean;
  created_at: string;
  updated_at: string;

  // Populated
  cliente_nome?: string;
  cliente_documento?: string;
  produto?: string;
  dias_para_expirar?: number;
}

export interface GS_ScannerResultado {
  id: string;
  contador_id: string;
  cliente_id?: string;
  machine_name: string;
  scanned_at: string;
  certificados: CertificadoMaquina[];
  total_encontrados: number;
  total_expirados: number;
  total_a_expirar: number;
}

export interface CertificadoMaquina {
  subject: string;
  issuer: string;
  thumbprint: string;
  notBefore: string;
  notAfter: string;
  diasRestantes: number;
  hasPrivateKey: boolean;
  storeLocation: string;
  storeName: string;
  finding: 'OK' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
}

export interface GS_NotaFiscal {
  id: string;
  ar_id: string;
  pedido_id?: string;
  cliente_id?: string;
  usuario_id?: string;
  numero?: string;
  serie?: string;
  tipo: 'NFSE' | 'NFE' | 'NFC_E';
  valor: number;
  chave_acesso?: string;
  xml_url?: string;
  pdf_url?: string;
  status: 'PENDENTE' | 'AUTORIZADA' | 'CANCELADA' | 'REJEITADA';
  gateway?: string;
  gateway_status?: string;
  gateway_id?: string;
  created_at: string;
  updated_at: string;
}

export const NF_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDENTE:   { label: 'Pendente',    bg: 'bg-amber-50', text: 'text-amber-700' },
  AUTORIZADA: { label: 'Autorizada',  bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELADA:  { label: 'Cancelada',   bg: 'bg-red-50',   text: 'text-red-700' },
  REJEITADA:  { label: 'Rejeitada',   bg: 'bg-red-50',   text: 'text-red-700' },
};

/** Script PowerShell para escanear certificados na máquina do cliente */
export const SCANNER_PS_SCRIPT = `# GS VEMAPI - Scanner de Certificados Digitais
# Execute este script no PowerShell como Administrador
# Os dados serão enviados ao GS para gestão da sua carteira

$report = @()

$stores = @(
  @{ Location = 'CurrentUser'; Name = 'My' },
  @{ Location = 'LocalMachine'; Name = 'My' }
)

foreach ($store in $stores) {
  $path = "Cert:\\$($store.Location)\\$($store.Name)"
  if (Test-Path $path) {
    Get-ChildItem -Path $path | ForEach-Object {
      $daysRemaining = ($_.NotAfter - (Get-Date)).Days
      $finding = if ($_.NotAfter -lt (Get-Date)) { 'EXPIRED' }
                 elseif ($daysRemaining -le 7) { 'CRITICAL' }
                 elseif ($daysRemaining -le 30) { 'WARNING' }
                 else { 'OK' }

      $report += [PSCustomObject]@{
        subject = $_.Subject
        issuer = $_.Issuer
        thumbprint = $_.Thumbprint
        notBefore = $_.NotBefore.ToString('yyyy-MM-ddTHH:mm:ss')
        notAfter = $_.NotAfter.ToString('yyyy-MM-ddTHH:mm:ss')
        diasRestantes = $daysRemaining
        hasPrivateKey = $_.HasPrivateKey
        storeLocation = $store.Location
        storeName = $store.Name
        finding = $finding
      }
    }
  }
}

# Enviar para o GS
$body = @{
  machineName = $env:COMPUTERNAME
  certificates = $report
  totalEncontrados = $report.Count
  totalExpirados = ($report | Where-Object { $_.finding -eq 'EXPIRED' }).Count
  totalAExpirar = ($report | Where-Object { $_.finding -eq 'WARNING' -or $_.finding -eq 'CRITICAL' }).Count
} | ConvertTo-Json

Write-Output $body
`;
