export const prerender = false;

// Polyfill global process object for Astro JSON logger compatibility in Cloudflare emulator
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = {
    env: {},
    versions: {},
    stderr: {
      write: () => true
    },
    stdout: {
      write: () => true
    }
  };
}

import type { APIRoute } from 'astro';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { niche, zipCode, companyName, contactName, phone, email } = body;

    // ── Server-side validation ──
    const errors: string[] = [];
    
    if (!niche || !['Toiture & Couverture', 'Pompe à Chaleur', 'Solaire Photovoltaïque', 'Rénovation Générale'].includes(niche)) {
      errors.push('Spécialité invalide ou manquante');
    }
    
    if (!zipCode || !/^\d{2,5}$/.test(zipCode)) {
      errors.push('Code postal ou département invalide (doit comporter entre 2 et 5 chiffres)');
    }
    
    if (!companyName || companyName.trim().length < 2) {
      errors.push("Nom d'entreprise requis (2 caractères minimum)");
    }
    
    if (!contactName || contactName.trim().length < 2) {
      errors.push('Nom du responsable requis (2 caractères minimum)');
    }
    
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      errors.push('Numéro de téléphone professionnel invalide (10 chiffres minimum)');
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Adresse e-mail invalide');
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const leadData = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      niche,
      zipCode,
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      phone: phone.replace(/\D/g, ''),
      email: email.trim(),
      ipAddress: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    // Log the lead data to the server terminal for visibility
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬 NOUVELLE CANDIDATURE WADE STUDIO REÇUE :');
    console.log(`  Spécialité : ${leadData.niche}`);
    console.log(`  Secteur     : ${leadData.zipCode}`);
    console.log(`  Entreprise  : ${leadData.companyName}`);
    console.log(`  Responsable : ${leadData.contactName}`);
    console.log(`  Téléphone   : ${leadData.phone}`);
    console.log(`  E-mail      : ${leadData.email}`);
    console.log(`  IP          : ${leadData.ipAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Attempt to save to a local JSON file (local dev environment only)
    if (import.meta.env.DEV) {
      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        
        const dataDir = path.resolve('./src/data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const filePath = path.join(dataDir, 'leads_received.json');
        let currentLeads = [];
        
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            currentLeads = JSON.parse(fileContent);
          } catch (e) {
            console.error('Failed to parse leads_received.json, resetting list.', e);
          }
        }
        
        currentLeads.push(leadData);
        fs.writeFileSync(filePath, JSON.stringify(currentLeads, null, 2), 'utf-8');
        console.log(`[Local DB] Lead details appended to: ${filePath}`);
      } catch (fsErr) {
        console.error('Failed to write lead to local database:', fsErr);
      }
    }

    return new Response(JSON.stringify({ success: true, leadId: leadData.id }), {
      status: 200,
      headers: CORS_HEADERS,
    });

  } catch (err: any) {
    console.error('[API Error] Fatal handler exception:', err);
    return new Response(JSON.stringify({
      success: false,
      errors: ['Une erreur interne est survenue. Veuillez réessayer.']
    }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};
