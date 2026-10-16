const fs = require('fs');

let code = fs.readFileSync('functions/src/controllers/settings.ts', 'utf8');

const startIdx = code.indexOf('export const getSecuritySettings =');
const endIdx = code.indexOf('export const getServiceConfig =');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find start or end index in settings.ts');
  process.exit(1);
}

const targetSection = code.substring(startIdx, endIdx);

const newSection = `export const getSecuritySettings = async (req: Request, res: Response) => {
  try {
    let cached = sysCache.get('security_settings');
    if (cached) {
      return res.status(200).json(cached);
    }

    const data = {
      sessionTimeout: 30,
      idleWarningTime: 25,
      enableIdleTimeout: true,
      enableSessionWarningPopup: true,
    };
    sysCache.set('security_settings', data, 300);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get security settings', details: error.message });
  }
};

export const updateSecuritySettings = async (req: Request, res: Response) => {
  try {
    const data = {
      sessionTimeout: req.body.sessionTimeout ?? 30,
      idleWarningTime: req.body.idleWarningTime ?? 25,
      enableIdleTimeout: req.body.enableIdleTimeout ?? true,
      enableSessionWarningPopup: req.body.enableSessionWarningPopup ?? true,
    };

    sysCache.set('security_settings', data, 300);
    clearSettingsCache();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update security settings', details: error.message });
  }
};

export const updateThemeSettings = async (req: Request, res: Response) => {
  try {
    const updated = await updateSettingsService({ theme: req.body });
    clearSettingsCache();
    return res.status(200).json(updated?.theme || req.body);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to write storefront visual presets', details: error.message });
  }
};

`;

code = code.replace(targetSection, newSection);
fs.writeFileSync('functions/src/controllers/settings.ts', code);
console.log('controllers/settings.ts updated successfully!');
