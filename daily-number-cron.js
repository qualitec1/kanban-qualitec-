import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Função robusta para ler o arquivo .env manualmente e carregar no process.env
function loadEnv() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      let currentKey = null;
      let currentValue = '';

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        if (trimmed.includes('=')) {
          if (currentKey) {
            process.env[currentKey] = currentValue;
          }
          const eqIdx = trimmed.indexOf('=');
          currentKey = trimmed.substring(0, eqIdx).trim();
          currentValue = trimmed.substring(eqIdx + 1).trim();
        } else {
          if (currentKey) {
            currentValue += trimmed;
          }
        }
      });
      if (currentKey) {
        process.env[currentKey] = currentValue;
      }

      // Remover aspas opcionais
      Object.keys(process.env).forEach(key => {
        let val = process.env[key];
        if (val && typeof val === 'string') {
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            process.env[key] = val.slice(1, -1);
          }
        }
      });
    }
  } catch (err) {
    console.error('Erro ao ler arquivo .env:', err);
  }
}

// Inicializar variáveis de ambiente
loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: SUPABASE_URL e as chaves do Supabase não foram encontradas no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendNumeralOne() {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log(`[${timestamp}] Iniciando envio do numeral 1 para a tabela daily_runs...`);
  
  try {
    const { data, error } = await supabase
      .from('daily_runs')
      .insert({ numeral: 1 })
      .select();

    if (error) {
      console.error('Erro ao inserir no Supabase:', error);
      process.exit(1);
    } else {
      console.log('Sucesso! Registro inserido:', data);
      process.exit(0);
    }
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

sendNumeralOne();
